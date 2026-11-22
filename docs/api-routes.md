# Spec 05: API Routes

## Route Table

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/complaints` | Citizen (Clerk) | Submit new complaint -> triggers agent |
| GET | `/api/complaints` | Any | List complaints (RLS-filtered by Supabase) |
| GET | `/api/complaints/[id]` | Any (RLS) | Single complaint detail |
| PATCH | `/api/complaints/[id]` | Official / Admin | Update status, assign facility |
| POST | `/api/complaints/[id]/resolve` | Official | Upload resolution photo -> triggers verification agent |
| POST | `/api/agent/severity` | Internal | Severity scoring tool endpoint |
| POST | `/api/agent/duplicate` | Internal | Duplicate detection tool endpoint |
| POST | `/api/agent/verify` | Internal | Resolution verification tool endpoint |
| POST | `/api/agent/escalate` | Internal | Escalation letter generation |
| POST | `/api/agent/chat` | Official | Natural language ward query |
| POST | `/api/upload` | Any | Image upload to Supabase Storage |
| GET | `/api/dashboard/queue` | Official | Priority-ranked queue for ward |
| POST | `/api/dashboard/assign` | Official | Assign complaint to facility |
| GET | `/api/map/public` | None | Public map data (lightweight) |
| GET | `/api/stats/ward` | Official | Ward-level statistics |

## Route Details

### POST /api/complaints

```typescript
// app/api/complaints/route.ts
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase/server';
import { CivicAgent } from '@/lib/agent/CivicAgent';

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const formData = await req.formData();
  const image = formData.get('image') as File;
  const lat = parseFloat(formData.get('lat') as string);
  const lng = parseFloat(formData.get('lng') as string);
  const category = formData.get('category') as string;
  const description = formData.get('description') as string;

  // 1. Upload image to Supabase Storage
  const fileName = `${userId}/${Date.now()}.jpg`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('complaint-images')
    .upload(fileName, image, { contentType: 'image/jpeg' });
  
  if (uploadError) return new Response('Upload failed', { status: 500 });
  const imageUrl = supabase.storage.from('complaint-images').getPublicUrl(fileName).data.publicUrl;

  // 2. Determine ward from GPS (reverse geocode or point-in-polygon query)
  const { data: ward } = await supabase.rpc('get_ward_from_point', { lat, lng });

  // 3. Insert complaint
  const { data: complaint, error } = await supabase
    .from('complaints')
    .insert({
      reporter_id: userId,
      ward_id: ward?.id,
      category,
      description,
      image_url: imageUrl,
      location: `POINT(${lng} ${lat})`,
      status: 'open',
    })
    .select()
    .single();

  if (error) return new Response(error.message, { status: 500 });

  // 4. Trigger AI agent (async, don't block response)
  const agent = new CivicAgent();
  
  // Severity scoring
  agent.run('scoreSeverity', {
    complaintId: complaint.id,
    imageUrl,
    category,
    description,
  }).then(async (result) => {
    await supabase.from('complaints')
      .update({ severity: result.severity })
      .eq('id', complaint.id);
  });

  // Duplicate check
  agent.run('checkDuplicate', {
    complaintId: complaint.id,
    location: [lat, lng],
    category,
    imageUrl,
    createdAt: complaint.created_at,
  }).then(async (result) => {
    if (result.isDuplicate && result.matchedClusterId) {
      await supabase.from('complaints')
        .update({ cluster_id: result.matchedClusterId })
        .eq('id', complaint.id);
      await supabase.rpc('increment_cluster_count', { cluster_id: result.matchedClusterId });
    }
  });

  return Response.json({ id: complaint.id, status: 'submitted' });
}
```

### POST /api/complaints/[id]/resolve

```typescript
// app/api/complaints/[id]/resolve/route.ts
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth();
  // ...auth check via RLS...

  const formData = await req.formData();
  const image = formData.get('image') as File;
  const lat = parseFloat(formData.get('lat') as string);
  const lng = parseFloat(formData.get('lng') as string);

  // Upload resolution image
  const resImageUrl = await uploadImage(image, `resolutions/${params.id}.jpg`);

  // Update complaint
  await supabase.from('complaints')
    .update({
      status: 'resolved',
      resolution_image_url: resImageUrl,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', params.id);

  // Trigger verification agent
  const { data: complaint } = await supabase.from('complaints').select('*').eq('id', params.id).single();
  
  const agent = new CivicAgent();
  const verification = await agent.run('verifyResolution', {
    beforeImageUrl: complaint.image_url,
    afterImageUrl: resImageUrl,
    beforeLocation: [complaint.location.lat, complaint.location.lng],
    afterLocation: [lat, lng],
    beforeTimestamp: complaint.created_at,
    afterTimestamp: new Date().toISOString(),
    category: complaint.category,
  });

  // Apply verification result
  if (verification.verified) {
    await supabase.from('complaints')
      .update({ status: 'verified', verification_score: verification.score, verification_status: 'passed' })
      .eq('id', params.id);
  } else if (verification.score < 0.4) {
    await supabase.from('complaints')
      .update({ status: 'in_progress', verification_score: verification.score, verification_status: 'failed' })
      .eq('id', params.id);
    // Notify facility
  } else {
    await supabase.from('complaints')
      .update({ verification_score: verification.score, verification_status: 'pending' })
      .eq('id', params.id);
  }

  return Response.json(verification);
}
```

### POST /api/agent/chat

```typescript
// app/api/agent/chat/route.ts
export async function POST(req: Request) {
  const { userId } = auth();
  const { query } = await req.json();

  // Get user's ward from profile
  const { data: profile } = await supabase.from('profiles').select('ward_id, role').eq('id', userId).single();
  if (profile.role !== 'official' && profile.role !== 'admin') {
    return new Response('Forbidden', { status: 403 });
  }

  const agent = new CivicAgent();
  const answer = await agent.run('answerChat', {
    query,
    wardId: profile.ward_id,
    userRole: profile.role,
  });

  return Response.json(answer);
}
```

## Supabase RPC Functions

```sql
-- Get ward from GPS point
CREATE OR REPLACE FUNCTION get_ward_from_point(lat float, lng float)
RETURNS TABLE(id uuid, name text) AS $$
  SELECT w.id, w.name
  FROM wards w
  WHERE ST_Contains(w.boundary, ST_SetSRID(ST_MakePoint(lng, lat), 4326))
  LIMIT 1;
$$ LANGUAGE sql;

-- Increment cluster count
CREATE OR REPLACE FUNCTION increment_cluster_count(cluster_id uuid)
RETURNS void AS $$
  UPDATE complaint_clusters
  SET complaint_count = complaint_count + 1
  WHERE id = cluster_id;
$$ LANGUAGE sql;

-- Get priority queue for ward
CREATE OR REPLACE FUNCTION get_priority_queue(target_ward_id uuid)
RETURNS TABLE(
  id uuid, category text, severity int, status text,
  weight bigint, sla_breached boolean, age_hours float
) AS $$
  SELECT 
    c.id, c.category, c.severity, c.status,
    COALESCE(cl.complaint_count, 1) AS weight,
    c.sla_deadline < NOW() AS sla_breached,
    EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 3600 AS age_hours
  FROM complaints c
  LEFT JOIN complaint_clusters cl ON c.cluster_id = cl.id
  WHERE c.ward_id = target_ward_id
    AND c.status IN ('open', 'assigned', 'in_progress')
  ORDER BY c.severity DESC, weight DESC, c.created_at ASC;
$$ LANGUAGE sql;
```
