import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ComplaintCategory, ComplaintStatus } from '@/lib/types/database';
import { CivicAgent } from '@/lib/agent/CivicAgent';
import sharp from 'sharp';

export type SubmitComplaintResponse = {
  success: boolean;
  id?: string;
  status?: 'submitted';
  ward_id?: string | null;
  ward_name?: string | null;
  image_url?: string;
  created_at?: string;
  error?: string;
};

export type ComplaintItem = {
  id: string;
  category: ComplaintCategory;
  severity: number;
  status: ComplaintStatus;
  description: string | null;
  image_url: string;
  address_text: string | null;
  created_at: string;
  ward_id: string | null;
  wards: {
    name: string;
    city: string;
  } | null;
};

export type ListComplaintsResponse = {
  success: boolean;
  complaints: ComplaintItem[];
  error?: string;
};

const VALID_CATEGORIES: ComplaintCategory[] = [
  'road',
  'garbage',
  'sewage',
  'school',
  'healthcenter',
  'other',
];

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

export async function POST(req: Request): Promise<Response> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json(
        { success: false, error: 'Unauthorized: You must be signed in to submit a complaint' } satisfies SubmitComplaintResponse,
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const image = formData.get('image') as File | null;
    const latStr = formData.get('lat') as string | null;
    const lngStr = formData.get('lng') as string | null;
    const category = formData.get('category') as string | null;
    const description = (formData.get('description') as string | null) || '';
    const addressText = (formData.get('address_text') as string | null) || '';

    // 1. Image validation
    if (!image || !(image instanceof File)) {
      return Response.json(
        { success: false, error: 'Photo evidence is required to submit a complaint' } satisfies SubmitComplaintResponse,
        { status: 400 }
      );
    }

    if (image.size > MAX_IMAGE_SIZE_BYTES) {
      return Response.json(
        {
          success: false,
          error: `Image too large (max 10MB). Selected image is ${(image.size / (1024 * 1024)).toFixed(1)}MB.`,
        } satisfies SubmitComplaintResponse,
        { status: 400 }
      );
    }

    if (image.type && !image.type.startsWith('image/')) {
      return Response.json(
        { success: false, error: 'Invalid file format: Only images (JPEG, PNG, WebP) are accepted' } satisfies SubmitComplaintResponse,
        { status: 400 }
      );
    }

    // 2. Location validation
    const lat = parseFloat(latStr || '');
    const lng = parseFloat(lngStr || '');

    if (isNaN(lat) || isNaN(lng)) {
      return Response.json(
        {
          success: false,
          error: 'Location coordinates are required for ward routing. Please allow GPS or pick on map.',
        } satisfies SubmitComplaintResponse,
        { status: 400 }
      );
    }

    // 3. Category validation
    if (!category || !VALID_CATEGORIES.includes(category as ComplaintCategory)) {
      return Response.json(
        {
          success: false,
          error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
        } satisfies SubmitComplaintResponse,
        { status: 400 }
      );
    }

    // 4. Server-side image compression with sharp (stream to buffer, not disk)
    const originalBuffer = Buffer.from(await image.arrayBuffer());
    let compressedBuffer: Buffer;
    try {
      compressedBuffer = await sharp(originalBuffer)
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();
    } catch {
      // Fallback to original buffer if sharp encountered an unsupported image stream
      compressedBuffer = originalBuffer;
    }

    const supabase = await createServerSupabaseClient();
    const fileName = `${userId}/${Date.now()}.jpg`;

    // 5. Upload to Supabase Storage complaint-images bucket
    const { error: uploadError } = await supabase.storage
      .from('complaint-images')
      .upload(fileName, compressedBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      return Response.json(
        { success: false, error: `Image upload failed: ${uploadError.message}` } satisfies SubmitComplaintResponse,
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('complaint-images').getPublicUrl(fileName);

    // 6. Ensure reporter profile exists to satisfy foreign key constraint
    await supabase.from('profiles').upsert(
      {
        id: userId,
        role: 'citizen',
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );

    // 7. Resolve ward using point-in-polygon RPC get_ward_from_point(lng, lat)
    const { data: wardList } = await supabase.rpc('get_ward_from_point', {
      lng,
      lat,
    });

    const matchedWard = Array.isArray(wardList) && wardList.length > 0 ? wardList[0] : null;

    // 8. Insert complaint row
    const { data: complaint, error: insertError } = await supabase
      .from('complaints')
      .insert({
        reporter_id: userId,
        ward_id: matchedWard?.id || null,
        category: category as ComplaintCategory,
        severity: 2, // Phase 3 standard default severity tier
        status: 'open',
        description: description.trim() || null,
        address_text: addressText.trim() || null,
        image_url: publicUrl,
        location: `SRID=4326;POINT(${lng} ${lat})`,
      })
      .select('id, reporter_id, ward_id, category, severity, status, description, image_url, address_text, created_at')
      .single();

    // 9. Error rollback: if insert fails, delete orphaned image from storage
    if (insertError || !complaint) {
      await supabase.storage.from('complaint-images').remove([fileName]);
      return Response.json(
        {
          success: false,
          error: `Complaint registration failed: ${insertError?.message || 'Unknown database error'}`,
        } satisfies SubmitComplaintResponse,
        { status: 500 }
      );
    }

    // 10. Asynchronously trigger severity scoring (Phase 05 Spec)
    // The citizen gets a "submitted" response immediately, severity updates in the background.
    const agent = new CivicAgent(process.env.GOOGLE_AI_API_KEY, supabase);
    agent.run(
      'scoreSeverity',
      {
        complaintId: complaint.id,
        imageUrl: publicUrl,
        category,
        description: description.trim() || undefined,
      },
      {
        complaintId: complaint.id,
        wardId: matchedWard?.id || undefined,
        supabase,
      }
    ).catch((agentErr) => {
      console.warn('[Complaint Submission] Background severity scoring warning:', agentErr);
    });

    return Response.json({
      success: true,
      id: complaint.id,
      status: 'submitted',
      ward_id: matchedWard?.id || null,
      ward_name: matchedWard?.name || null,
      image_url: publicUrl,
      created_at: complaint.created_at,
    } satisfies SubmitComplaintResponse);
  } catch (err: unknown) {
    const error = err as Error;
    return Response.json(
      { success: false, error: error.message || 'Internal server error while processing complaint' } satisfies SubmitComplaintResponse,
      { status: 500 }
    );
  }
}

export async function GET(): Promise<Response> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json(
        { success: false, complaints: [], error: 'Unauthorized' } satisfies ListComplaintsResponse,
        { status: 401 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: complaints, error } = await supabase
      .from('complaints')
      .select(`
        id,
        category,
        severity,
        status,
        description,
        image_url,
        address_text,
        created_at,
        ward_id,
        wards (
          name,
          city
        )
      `)
      .eq('reporter_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return Response.json(
        { success: false, complaints: [], error: error.message } satisfies ListComplaintsResponse,
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      complaints: (complaints as unknown as ComplaintItem[]) || [],
    } satisfies ListComplaintsResponse);
  } catch (err: unknown) {
    const error = err as Error;
    return Response.json(
      { success: false, complaints: [], error: error.message } satisfies ListComplaintsResponse,
      { status: 500 }
    );
  }
}
