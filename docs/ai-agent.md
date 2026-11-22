# Spec 03: AI Agent Architecture

## Core Principle

The agent is a TypeScript class with a defined toolset. The LLM (Gemini 1.5 Flash) is the brain. Tools are the hands. The agent never hallucinates a fact it can look up, and it never guesses at a verification it can compute.

```typescript
// lib/agent/CivicAgent.ts

interface Tool {
  name: string;
  description: string;
  parameters: z.ZodSchema;
  execute: (args: any, context: AgentContext) => Promise<ToolResult>;
}

interface AgentContext {
  complaintId?: string;
  wardId?: string;
  userRole: 'citizen' | 'official' | 'admin';
}

class CivicAgent {
  private llm: GoogleGenerativeAI;
  private tools: Map<string, Tool>;
  
  constructor() {
    this.llm = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
    this.tools = new Map([
      ['scoreSeverity', severityTool],
      ['checkDuplicate', duplicateTool],
      ['verifyResolution', verificationTool],
      ['generateEscalation', escalationTool],
      ['answerChat', chatTool],
    ]);
  }

  async run(task: string, context: AgentContext): Promise<AgentResult> {
    // 1. Build system prompt with tool descriptions
    // 2. Call LLM with function calling enabled
    // 3. If tool call requested -> execute tool -> feed result back to LLM
    // 4. Return final answer with full trace
  }
}
```

## Tool Definitions

### Tool 1: `scoreSeverity`

**Purpose:** Classify a submitted complaint image into severity tiers.

**When called:** Immediately after complaint submission, before the complaint hits the public queue.

**Input:**
```typescript
{
  imageUrl: string;        // Supabase Storage public URL
  category: string;        // 'road' | 'garbage' | 'sewage' | 'school' | 'healthcenter' | 'other'
  description?: string;    // Voice transcript or text description
}
```

**Execution:**
1. Fetch image from URL
2. Call Gemini 1.5 Flash with vision:
   ```
   System: You are a civic infrastructure severity assessor.
   Rate the severity of the issue in this image on a scale of 1-4:
   1 = cosmetic (graffiti, minor litter)
   2 = significant (pothole, overflowing bin)
   3 = critical (large sinkhole, broken water main)
   4 = emergency (collapsed road, active sewage leak, dangerous electrical)
   
   Respond ONLY with a JSON object: {"severity": 1-4, "reason": "one sentence"}
   ```
3. Parse JSON response
4. Validate severity is 1-4

**Output:**
```typescript
{
  severity: 1 | 2 | 3 | 4;
  reason: string;
  confidence: number;  // 0-1, derived from model token probabilities if available
}
```

**Fallback:** If the model returns unparseable JSON or an invalid severity, default to 2 (significant) and log the trace. Never fail the complaint submission because the AI failed.

---

### Tool 2: `checkDuplicate`

**Purpose:** Determine if a new complaint is a duplicate of an existing one.

**When called:** After severity scoring, before inserting as a new ticket.

**Input:**
```typescript
{
  complaintId: string;     // The new complaint's ID
  location: [number, number]; // [lat, lng]
  category: string;
  imageUrl: string;
  createdAt: string;       // ISO timestamp
}
```

**Execution:**
1. SQL query: find complaints within 100m, same category, last 30 days
2. For each candidate, compute perceptual hash of both images using `phash` library
3. Hamming distance < 15 -> likely same image/angle
4. If geospatial + hash match: duplicate found
5. If geospatial match but hash different: LLM vision comparison as tiebreaker

**Output:**
```typescript
{
  isDuplicate: boolean;
  matchedComplaintId?: string;
  matchedClusterId?: string;
  method: 'geospatial' | 'hash' | 'vision';
  confidence: number;
}
```

**Important:** This tool uses code (DBSCAN, perceptual hash) for the heavy lifting. The LLM is only consulted as a tiebreaker. The agent calls this tool; it does not implement the algorithm.

---

### Tool 3: `verifyResolution`

**Purpose:** Compare before and after images to determine if the fix is genuine.

**When called:** When a facility marks a complaint as "resolved" and uploads a resolution photo.

**Input:**
```typescript
{
  beforeImageUrl: string;
  afterImageUrl: string;
  beforeLocation: [number, number];
  afterLocation: [number, number];
  beforeTimestamp: string;
  afterTimestamp: string;
  category: string;
}
```

**Execution:**
1. **GPS check:** Compute haversine distance between before/after locations. If > 100m, reject immediately with reason "location mismatch".
2. **Timestamp check:** After must be > before. If not, reject.
3. **Perceptual hash comparison:** Hamming distance of phash. If < 5, images are nearly identical -> likely fake (same photo re-uploaded).
4. **Vision model comparison:** Call Gemini with both images:
   ```
   System: Compare these two images of the same location. 
   Image 1 was taken when the issue was reported. Image 2 was taken after a claimed fix.
   Has the issue been genuinely addressed? Respond with JSON: 
   {"verified": boolean, "confidence": 0-1, "reason": "string"}
   ```
5. **Composite score:** weighted average of hash distance (inverted), GPS proximity, and vision confidence.

**Output:**
```typescript
{
  verified: boolean;
  score: number;           // 0-1 composite
  confidence: number;      // 0-1
  reason: string;
  checks: {
    gpsMatch: boolean;
    hashDifferent: boolean;
    visionVerdict: boolean;
  }
}
```

**Thresholds:**
- Score >= 0.75: auto-pass -> status becomes 'verified'
- Score 0.4-0.75: manual review -> status stays 'resolved', flagged for controller
- Score < 0.4: auto-fail -> status returns to 'in_progress', facility notified

---

### Tool 4: `generateEscalation`

**Purpose:** Draft a formal escalation letter when a complaint is ghost-closed or SLA-breached.

**When called:** By cron or manual trigger when SLA deadline passes or verification fails.

**Input:**
```typescript
{
  complaintId: string;
  trigger: 'sla_breach' | 'verification_failed' | 'ghost_closure';
  wardName: string;
  city: string;
  state: string;
  category: string;
  description: string;
  submissionDate: string;
  claimedResolutionDate?: string;
  evidenceUrls: string[];  // Before/after photos, if available
}
```

**Execution:**
1. Load state-specific RTI/appeal template from `templates/` directory
2. Populate template with complaint data
3. LLM polishes the language while preserving legal format:
   ```
   System: You are drafting a formal municipal grievance escalation letter.
   Use the provided template structure. Do NOT invent facts not in the input.
   Keep the tone formal, specific, and actionable. Include the complaint ID and dates.
   ```
4. Generate PDF via `pdf-lib` or `puppeteer`

**Output:**
```typescript
{
  letterContent: string;    // Full text
  pdfUrl: string;           // Supabase Storage path
  authority: string;        // Who to send it to
  submissionDeadline: string; // Date by which it must be submitted
  format: 'rti' | 'appeal' | 'commissioner_letter';
}
```

---

### Tool 5: `answerChat`

**Purpose:** Answer natural language questions from officials about ward data.

**When called:** When an official submits a query in the chat panel.

**Input:**
```typescript
{
  query: string;           // e.g., "Show me all open sewage complaints over 14 days old"
  wardId: string;
  userRole: string;
}
```

**Execution:**
1. LLM converts query to structured filter:
   ```
   System: Convert this natural language query into a structured filter object.
   Available fields: category, status, severity, created_after, created_before, has_cluster
   Respond with JSON only: {"category": "...", "status": "...", ...}
   ```
2. Execute SQL query with the filters
3. LLM formats the results into a natural answer:
   ```
   System: Answer the user's question using ONLY the data provided below.
   If the data doesn't contain the answer, say "I don't have that information."
   Data: {query_results}
   ```

**Output:**
```typescript
{
  answer: string;
  dataQuery: string;       // The SQL that was run
  resultCount: number;
  sources: {complaintId: string, snippet: string}[];
}
```

**Critical constraint:** The answer must reference the SQL query that produced it. An answer with no query behind it is a hallucination and the exact failure this tool exists to prevent.

## Agent Trace Logging

Every tool execution is logged to the `agent_traces` table:

```typescript
async function logTrace(trace: {
  complaintId?: string;
  toolName: string;
  inputSummary: object;
  outputSummary: object;
  modelUsed: string;
  latencyMs: number;
}) {
  await supabase.from('agent_traces').insert(trace);
}
```

This makes the agent auditable. An official can click "Why did this score 4?" and see the exact image, prompt, and response that produced it.

## Error Handling

| Failure | Response |
|---|---|
| LLM API timeout | Retry once, then return safe default (severity=2, duplicate=false) |
| Image fetch fails | Skip vision step, use text description only |
| Unparseable JSON from LLM | Log raw response, return safe default |
| GPS missing from photo EXIF | Use citizen-submitted GPS from form, note in trace |
| Hash comparison fails | Fall back to vision-only verification |

## Model Selection

| Task | Model | Reason |
|---|---|---|
| Severity scoring | Gemini 1.5 Flash | Fast, cheap, multimodal |
| Duplicate vision tiebreaker | Gemini 1.5 Flash | Same model, consistent |
| Verification comparison | Gemini 1.5 Pro | More accurate for before/after comparison |
| Escalation letter draft | Gemini 1.5 Flash | Text-only, speed matters |
| Chat answer | Gemini 1.5 Flash | Fast for query -> filter conversion |

Use Flash as default. Promote to Pro only for verification, where accuracy matters most.
