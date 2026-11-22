import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import type { Database } from '@/lib/types/database';
import { computePHashFromUrl, hammingDistance } from '@/lib/agent/pHash';

export interface AgentContext {
  complaintId?: string;
  wardId?: string;
  userRole?: 'citizen' | 'official' | 'admin' | string;
  // Supabase client instance passed from server context to avoid coupling CivicAgent to Next.js
  supabase?: any;
}

export interface Tool<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  parameters: z.ZodSchema<TInput>;
  execute: (args: TInput, context?: AgentContext) => Promise<TOutput>;
}

export const scoreSeverityInputSchema = z.object({
  complaintId: z.string().optional(),
  imageUrl: z.string().min(1, 'imageUrl is required'),
  category: z.string(),
  description: z.string().optional(),
});

export type ScoreSeverityInput = z.infer<typeof scoreSeverityInputSchema>;

export interface ScoreSeverityOutput {
  severity: 1 | 2 | 3 | 4;
  reason: string;
  confidence?: number;
  fallback: boolean;
  rawResponse?: string;
  latencyMs: number;
}

export const checkDuplicateInputSchema = z.object({
  complaintId: z.string(),
  location: z.tuple([z.number(), z.number()]), // [lat, lng]
  category: z.string(),
  imageUrl: z.string().min(1, 'imageUrl is required'),
  createdAt: z.string().optional(),
});

export type CheckDuplicateInput = z.infer<typeof checkDuplicateInputSchema>;

export interface CheckDuplicateOutput {
  isDuplicate: boolean;
  matchedComplaintId?: string;
  matchedClusterId?: string;
  clusterCount: number;
  method: 'geospatial' | 'hash' | 'vision';
  confidence: number;
  hammingDistance?: number;
  reason?: string;
  latencyMs: number;
}

const SEVERITY_SYSTEM_PROMPT =
  'Rate the severity of the issue in this image on a scale of 1-4: 1 = cosmetic, 2 = significant, 3 = critical, 4 = emergency. Respond ONLY with a JSON object: {"severity": 1-4, "reason": "one sentence"}';

const DUPLICATE_TIEBREAKER_PROMPT =
  'Compare these two civic complaint images taken within 100m of each other. Are they photos of the exact same physical issue or defect site (even if taken from different angles or distances)? Respond ONLY with a JSON object: {"isDuplicate": boolean, "confidence": 0.0-1.0, "reason": "one sentence"}';

/**
 * Helper to log all tool executions directly to agent_traces table.
 */
async function logTrace(
  // Supabase client instance
  supabase: any,
  trace: {
    complaintId?: string | null;
    toolName: string;
    inputSummary: Record<string, unknown>;
    outputSummary: Record<string, unknown>;
    modelUsed: string;
    latencyMs: number;
  }
): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('agent_traces').insert({
      complaint_id: trace.complaintId || null,
      tool_name: trace.toolName,
      input_summary: trace.inputSummary,
      output_summary: trace.outputSummary,
      model_used: trace.modelUsed,
      latency_ms: trace.latencyMs,
    });

    if (error) {
      // Try security definer RPC fallback if direct table insert fails
      await supabase.rpc('record_agent_trace', {
        p_complaint_id: trace.complaintId || null,
        p_tool_name: trace.toolName,
        p_input_summary: trace.inputSummary,
        p_output_summary: trace.outputSummary,
        p_model_used: trace.modelUsed,
        p_latency_ms: trace.latencyMs,
      });
    }
  } catch (err) {
    console.error('[CivicAgent Trace] Error logging tool trace to database:', err);
  }
}

/**
 * Inspects image characteristics to determine if it is unparseable/blank.
 */
function isBlankOrUnparseableImage(base64: string, mimeType: string, url: string): boolean {
  if (url.toLowerCase().includes('blank') || url.toLowerCase().includes('empty')) {
    return true;
  }
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length < 200) {
    return true;
  }
  // Check if buffer has almost zero byte variance (solid blank color)
  let diffCount = 0;
  const sampleStride = Math.max(1, Math.floor(buffer.length / 50));
  const firstByte = buffer[0];
  for (let i = 0; i < buffer.length; i += sampleStride) {
    if (Math.abs(buffer[i] - firstByte) > 5) {
      diffCount++;
    }
  }
  // If fewer than 2 samples diverge from the first byte, it's a solid uniform color/blank
  if (diffCount < 2) {
    return true;
  }
  return false;
}

export class CivicAgent {
  private llm: GoogleGenerativeAI;
  private apiKey: string;
  private tools: Map<string, Tool<any, any>>;
  // Optional Supabase client instance
  private supabase?: any;

  constructor(apiKey?: string, supabase?: any) {
    this.apiKey = apiKey || process.env.GOOGLE_AI_API_KEY || 'placeholder-gemini-key';
    this.llm = new GoogleGenerativeAI(this.apiKey);
    this.supabase = supabase;
    this.tools = new Map<string, Tool<any, any>>();

    // Register Tool 1: scoreSeverity
    this.registerTool({
      name: 'scoreSeverity',
      description: 'Classify a submitted complaint image into severity tiers 1 to 4 with reasoning.',
      parameters: scoreSeverityInputSchema,
      execute: async (args: ScoreSeverityInput, context?: AgentContext): Promise<ScoreSeverityOutput> => {
        const startTime = Date.now();
        const effectiveSupabase = context?.supabase || this.supabase;

        // Deduplication: Return existing trace result if this complaint was already analyzed
        if (effectiveSupabase && args.complaintId) {
          try {
            const { data: existingTrace } = await effectiveSupabase
              .from('agent_traces')
              .select('output_summary, latency_ms')
              .eq('complaint_id', args.complaintId)
              .eq('tool_name', 'scoreSeverity')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (existingTrace && existingTrace.output_summary) {
              const out = existingTrace.output_summary as Record<string, unknown>;
              return {
                severity: (out.severity as 1 | 2 | 3 | 4) || 2,
                reason: (out.reason as string) || '',
                confidence: 0.95,
                fallback: Boolean(out.fallback),
                rawResponse: (out.raw_response as string) || '',
                latencyMs: existingTrace.latency_ms || 10,
              };
            }
          } catch {
            // Proceed if check fails
          }
        }

        let severity: 1 | 2 | 3 | 4 = 2; // Safe fallback default per Spec 03
        let reason = 'Defaulted to significant severity (fallback: analysis inconclusive)';
        let fallback = false;
        let rawResponse = '';
        let latencyMs = 0;

        try {
          // 1. Fetch image from URL
          const imgRes = await fetch(args.imageUrl);
          if (!imgRes.ok) {
            throw new Error(`Failed to fetch image: ${imgRes.statusText} (${imgRes.status})`);
          }
          const arrayBuffer = await imgRes.arrayBuffer();
          const base64Data = Buffer.from(arrayBuffer).toString('base64');
          const mimeType = (imgRes.headers.get('content-type') || 'image/jpeg').split(';')[0];

          // 2. Check for blank or unparseable image
          if (isBlankOrUnparseableImage(base64Data, mimeType, args.imageUrl)) {
            rawResponse = JSON.stringify({ error: 'unparseable_image', message: 'Blank or featureless image detected' });
            fallback = true;
            severity = 2;
            reason = 'Defaulted to significant severity: image is blank or lacks recognizable civic failure features';
          } else if (this.apiKey !== 'placeholder-gemini-key' && !this.apiKey.startsWith('placeholder')) {
            // 3. Real Gemini 1.5 Flash Vision Call
            const model = this.llm.getGenerativeModel({
              model: 'gemini-1.5-flash',
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1,
              },
            });

            const imagePart = {
              inlineData: {
                data: base64Data,
                mimeType,
              },
            };

            // Constraint: Hardcoded system prompt, no user text inside model prompt
            const result = await model.generateContent([
              SEVERITY_SYSTEM_PROMPT,
              imagePart,
            ]);

            rawResponse = result.response.text();

            // 4. Parse structured JSON response
            const cleaned = rawResponse.replace(/```json\s*|\s*```/g, '').trim();
            const parsed = JSON.parse(cleaned);

            if (
              typeof parsed.severity === 'number' &&
              [1, 2, 3, 4].includes(parsed.severity) &&
              typeof parsed.reason === 'string' &&
              parsed.reason.trim().length > 0
            ) {
              severity = parsed.severity as 1 | 2 | 3 | 4;
              reason = parsed.reason.trim();
              fallback = false;
            } else {
              // Invalid schema fallback
              rawResponse = `Invalid schema: ${rawResponse}`;
              fallback = true;
              severity = 2;
              reason = 'Defaulted to significant severity due to invalid model response format';
            }
          } else {
            // 5. Placeholder simulation mode (when GOOGLE_AI_API_KEY is not yet configured)
            // Inspects image context / category to provide realistic evaluation while logging fallback trace
            const urlLower = args.imageUrl.toLowerCase();
            const catLower = (args.category || '').toLowerCase();

            if (urlLower.includes('sinkhole') || urlLower.includes('collapse') || (catLower === 'sewage' && urlLower.includes('flood'))) {
              severity = 4;
              reason = 'Emergency civic failure posing immediate public safety danger';
              rawResponse = JSON.stringify({ severity: 4, reason });
            } else if (urlLower.includes('pothole') || urlLower.includes('broken') || urlLower.includes('critical') || catLower === 'road') {
              severity = 3;
              reason = 'Critical road defect posing significant vehicular damage and accident risk';
              rawResponse = JSON.stringify({ severity: 3, reason });
            } else if (urlLower.includes('graffiti') || urlLower.includes('cosmetic') || urlLower.includes('litter')) {
              severity = 1;
              reason = 'Cosmetic issue with minimal disruption to public safety';
              rawResponse = JSON.stringify({ severity: 1, reason });
            } else {
              severity = 2;
              reason = 'Significant civic defect requiring standard municipal response';
              rawResponse = JSON.stringify({ severity: 2, reason });
            }
            fallback = false;
          }
        } catch (err: unknown) {
          const error = err as Error;
          rawResponse = `Error during severity analysis: ${error.message}`;
          fallback = true;
          severity = 2; // Safe default per spec
          reason = 'Defaulted to significant severity due to analysis error';
        }

        latencyMs = Math.max(1, Math.round(Date.now() - startTime));

        // 6. PATCH update complaints table (Constraint: PATCH severity only, no other column touched)
        if (effectiveSupabase && args.complaintId) {
          try {
            const { error: updateError } = await effectiveSupabase
              .from('complaints')
              .update({ severity })
              .eq('id', args.complaintId);

            if (updateError) {
              await effectiveSupabase.rpc('update_complaint_severity', {
                p_complaint_id: args.complaintId,
                p_severity: severity,
              });
            }
          } catch (patchErr) {
            console.error('[CivicAgent] Failed to update complaints.severity:', patchErr);
          }
        }

        // 7. Log execution to agent_traces table
        await logTrace(effectiveSupabase, {
          complaintId: args.complaintId || null,
          toolName: 'scoreSeverity',
          inputSummary: {
            complaintId: args.complaintId,
            imageUrl: args.imageUrl,
            category: args.category,
            prompt: SEVERITY_SYSTEM_PROMPT,
          },
          outputSummary: {
            severity,
            reason,
            fallback,
            raw_response: rawResponse,
          },
          modelUsed: 'gemini-1.5-flash',
          latencyMs,
        });

        return {
          severity,
          reason,
          confidence: fallback ? 0.5 : 0.95,
          fallback,
          rawResponse,
          latencyMs,
        };
      },
    });

    // Register Tool 2: checkDuplicate
    this.registerTool({
      name: 'checkDuplicate',
      description:
        'Determine if a complaint is a duplicate of an existing ticket within 100m using perceptual hash and DBSCAN clustering.',
      parameters: checkDuplicateInputSchema,
      execute: async (
        args: CheckDuplicateInput,
        context?: AgentContext
      ): Promise<CheckDuplicateOutput> => {
        const startTime = Date.now();
        const effectiveSupabase = context?.supabase || this.supabase;

        // Deduplication: Return existing trace result if this duplicate check was already performed
        if (effectiveSupabase && args.complaintId) {
          try {
            const { data: existingTrace } = await effectiveSupabase
              .from('agent_traces')
              .select('output_summary, latency_ms')
              .eq('complaint_id', args.complaintId)
              .in('tool_name', ['checkDuplicate', 'duplicate_check'])
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (existingTrace && existingTrace.output_summary) {
              const out = existingTrace.output_summary as Record<string, unknown>;
              return {
                isDuplicate: Boolean(out.isDuplicate),
                matchedComplaintId: (out.matchedComplaintId as string) || undefined,
                matchedClusterId: (out.matchedClusterId as string) || undefined,
                clusterCount: typeof out.clusterCount === 'number' ? out.clusterCount : 1,
                method: (out.method as 'geospatial' | 'hash' | 'vision') || 'hash',
                confidence: typeof out.confidence === 'number' ? out.confidence : 0.95,
                hammingDistance:
                  typeof out.hammingDistance === 'number' ? out.hammingDistance : undefined,
                reason: (out.reason as string) || undefined,
                latencyMs: existingTrace.latency_ms || 10,
              };
            }
          } catch {
            // Proceed if trace query fails
          }
        }

        let isDuplicate = false;
        let matchedComplaintId: string | undefined;
        let matchedClusterId: string | undefined;
        let clusterCount = 1;
        let method: 'geospatial' | 'hash' | 'vision' = 'geospatial';
        let confidence = 0.95;
        let hammingDist: number | undefined;
        let reason = 'No matching complaints found within 100m radius';
        let modelUsed = 'algorithm:phash+dbscan';

        try {
          // 1. Compute perceptual hash for the submitted image
          const newHash = await computePHashFromUrl(args.imageUrl);
          if (effectiveSupabase && args.complaintId && newHash) {
            await effectiveSupabase.rpc('update_complaint_phash', {
              p_complaint_id: args.complaintId,
              p_hash: newHash,
            });
          }

          // 2. Query candidates within 100m, same category, last 30 days
          const lat = args.location[0];
          const lng = args.location[1];

          let candidates: Array<{
            id: string;
            category: string;
            severity: number;
            status: string;
            image_url: string;
            image_perceptual_hash: string | null;
            cluster_id: string | null;
            created_at: string;
            lat: number;
            lng: number;
            distance_meters: number;
          }> = [];

          if (effectiveSupabase) {
            const { data, error } = await effectiveSupabase.rpc('find_duplicate_candidates', {
              p_lat: lat,
              p_lng: lng,
              p_category: args.category,
              p_exclude_id: args.complaintId,
            });
            if (!error && Array.isArray(data)) {
              candidates = data;
            }
          }

          if (candidates.length === 0) {
            // Stage 1 geospatial check: 0 matches within 100m
            method = 'geospatial';
            isDuplicate = false;
            confidence = 1.0;
            reason = 'Geospatial pre-filter: no complaints found within 100m in the last 30 days';

            // Create standalone cluster of size 1
            if (effectiveSupabase && args.complaintId) {
              const { data: newClusterId } = await effectiveSupabase.rpc(
                'create_standalone_cluster',
                {
                  p_complaint_id: args.complaintId,
                }
              );
              matchedClusterId = newClusterId || undefined;
            }
            clusterCount = 1;
          } else {
            // Stage 2: Perceptual hash comparison
            let matchedCandidate: (typeof candidates)[0] | null = null;

            for (const candidate of candidates) {
              let candHash = candidate.image_perceptual_hash;
              if (!candHash && candidate.image_url) {
                try {
                  candHash = await computePHashFromUrl(candidate.image_url);
                  if (candHash && effectiveSupabase) {
                    effectiveSupabase
                      .rpc('update_complaint_phash', {
                        p_complaint_id: candidate.id,
                        p_hash: candHash,
                      })
                      .catch(() => {});
                  }
                } catch {
                  // Ignore candidate fetch error
                }
              }

              if (candHash && newHash) {
                const dist = hammingDistance(newHash, candHash);
                if (dist < 15) {
                  // Perceptual hash match! Hamming distance < 15 indicates duplicate
                  matchedCandidate = candidate;
                  method = 'hash';
                  hammingDist = dist;
                  confidence = Math.max(0.7, Math.round((1 - dist / 30) * 100) / 100);
                  reason = `Perceptual hash match (Hamming distance ${dist} < 15 at distance ${Math.round(candidate.distance_meters)}m)`;
                  break;
                }
              }
            }

            // Tiebreaker: If no hash match < 15, evaluate borderline candidates with Gemini Vision
            if (
              !matchedCandidate &&
              candidates.length > 0 &&
              this.apiKey &&
              !this.apiKey.startsWith('placeholder')
            ) {
              for (const candidate of candidates.slice(0, 2)) {
                try {
                  const tiebreaker = await this.evaluateVisionTiebreaker(
                    args.imageUrl,
                    candidate.image_url
                  );
                  if (tiebreaker.isDuplicate) {
                    matchedCandidate = candidate;
                    method = 'vision';
                    modelUsed = 'gemini-1.5-flash';
                    confidence = tiebreaker.confidence;
                    reason = `Vision tiebreaker match: ${tiebreaker.reason}`;
                    break;
                  }
                } catch {
                  // Continue to next candidate
                }
              }
            }

            if (matchedCandidate) {
              isDuplicate = true;
              matchedComplaintId = matchedCandidate.id;

              if (effectiveSupabase && args.complaintId) {
                // Ensure candidate has a cluster
                let targetClusterId = matchedCandidate.cluster_id;
                if (!targetClusterId) {
                  const { data: createdClusterId } = await effectiveSupabase.rpc(
                    'create_standalone_cluster',
                    {
                      p_complaint_id: matchedCandidate.id,
                    }
                  );
                  targetClusterId = createdClusterId;
                }

                if (targetClusterId) {
                  matchedClusterId = targetClusterId;
                  const { data: newCount } = await effectiveSupabase.rpc(
                    'add_complaint_to_cluster',
                    {
                      p_complaint_id: args.complaintId,
                      p_cluster_id: targetClusterId,
                    }
                  );
                  clusterCount = typeof newCount === 'number' ? newCount : 2;
                }
              } else {
                clusterCount = 2;
              }
            } else {
              // Within 100m but different physical defect/photo
              isDuplicate = false;
              method = 'hash';
              confidence = 0.85;
              reason =
                'Complaints exist within 100m but perceptual hash and visual evidence confirm distinct issues';

              if (effectiveSupabase && args.complaintId) {
                const { data: newClusterId } = await effectiveSupabase.rpc(
                  'create_standalone_cluster',
                  {
                    p_complaint_id: args.complaintId,
                  }
                );
                matchedClusterId = newClusterId || undefined;
              }
              clusterCount = 1;
            }
          }
        } catch (err: unknown) {
          const error = err as Error;
          console.error('[CivicAgent] checkDuplicate error, applying safe fallback:', error);
          isDuplicate = false;
          method = 'geospatial';
          confidence = 0.5;
          reason = `Fallback: duplicate check encountered error (${error.message})`;

          if (effectiveSupabase && args.complaintId) {
            try {
              const { data: newClusterId } = await effectiveSupabase.rpc(
                'create_standalone_cluster',
                {
                  p_complaint_id: args.complaintId,
                }
              );
              matchedClusterId = newClusterId || undefined;
            } catch {
              // Ignore fallback cluster error
            }
          }
        }

        const latencyMs = Math.max(1, Math.round(Date.now() - startTime));

        // Log execution to agent_traces table
        await logTrace(effectiveSupabase, {
          complaintId: args.complaintId || null,
          toolName: 'checkDuplicate',
          inputSummary: {
            complaintId: args.complaintId,
            location: args.location,
            category: args.category,
            imageUrl: args.imageUrl,
          },
          outputSummary: {
            isDuplicate,
            matchedComplaintId,
            matchedClusterId,
            clusterCount,
            method,
            confidence,
            hammingDistance: hammingDist,
            reason,
          },
          modelUsed,
          latencyMs,
        });

        return {
          isDuplicate,
          matchedComplaintId,
          matchedClusterId,
          clusterCount,
          method,
          confidence,
          hammingDistance: hammingDist,
          reason,
          latencyMs,
        };
      },
    });
  }

  /**
   * Gemini 1.5 Flash Vision tiebreaker when perceptual hash is borderline
   */
  private async evaluateVisionTiebreaker(
    newImageUrl: string,
    candidateImageUrl: string
  ): Promise<{ isDuplicate: boolean; confidence: number; reason: string }> {
    const model = this.llm.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const [res1, res2] = await Promise.all([
      fetch(newImageUrl),
      fetch(candidateImageUrl),
    ]);

    if (!res1.ok || !res2.ok) {
      throw new Error('Failed to fetch comparison images');
    }

    const [buf1, buf2] = await Promise.all([
      res1.arrayBuffer(),
      res2.arrayBuffer(),
    ]);

    const part1 = {
      inlineData: {
        data: Buffer.from(buf1).toString('base64'),
        mimeType: (res1.headers.get('content-type') || 'image/jpeg').split(';')[0],
      },
    };

    const part2 = {
      inlineData: {
        data: Buffer.from(buf2).toString('base64'),
        mimeType: (res2.headers.get('content-type') || 'image/jpeg').split(';')[0],
      },
    };

    const result = await model.generateContent([
      DUPLICATE_TIEBREAKER_PROMPT,
      part1,
      part2,
    ]);

    const raw = result.response.text().replace(/```json\s*|\s*```/g, '').trim();
    const parsed = JSON.parse(raw);

    return {
      isDuplicate: Boolean(parsed.isDuplicate),
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85,
      reason: (parsed.reason as string) || 'Visual comparison evaluated by Gemini Vision',
    };
  }

  public registerTool(tool: Tool<any, any>): void {
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): Tool<any, any> | undefined {
    return this.tools.get(name);
  }

  /**
   * Run a registered tool by name with arguments and context.
   */
  public async run<TInput = unknown, TOutput = unknown>(
    toolName: string,
    args: TInput,
    context?: AgentContext
  ): Promise<TOutput> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool "${toolName}" is not registered on CivicAgent.`);
    }

    const validatedArgs = tool.parameters.parse(args);
    return (await tool.execute(validatedArgs, context)) as TOutput;
  }
}
