import { clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAILS = [
  'sessionbyilder7@gmail.com',
  'jm6159884@gmail.com',
  'junaid03mo22@gmail.com',
  'demo.admin@nigamsetu.gov.in',
];
const WARD_BANJARA_HILLS = 'a0000000-0000-0000-0000-000000000001';

async function main() {
  console.log(`=== Granting Admin Access to All Testing & Persona Accounts ===\n`);

  const client = await clerkClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xlagdiqtedflkigftwov.supabase.co';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_7y4gVv5VE6TVDPqvGewU4Q_0PTa9PuB';

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { 'x-user-role': 'admin' } },
    auth: { persistSession: false },
  });

  const allUsers = await client.users.getUserList({ limit: 100 });

  for (const user of allUsers.data) {
    const userEmails = user.emailAddresses.map((e) => e.emailAddress.toLowerCase());
    const matchedEmail = ADMIN_EMAILS.find((target) => userEmails.includes(target.toLowerCase()));

    if (matchedEmail) {
      console.log(`[Clerk] Granting admin to ${matchedEmail} (ID: ${user.id})...`);
      await client.users.updateUserMetadata(user.id, {
        publicMetadata: {
          role: 'admin',
          ward_id: WARD_BANJARA_HILLS,
        },
      });

      console.log(`[Supabase] Syncing admin profile for ${user.id}...`);
      await supabase.from('profiles').upsert(
        {
          id: user.id,
          role: 'admin',
          ward_id: WARD_BANJARA_HILLS,
          phone: '+919999999999',
        },
        { onConflict: 'id' }
      );
      console.log(`[OK] ${matchedEmail} is now an active Admin in both Clerk and Supabase.\n`);
    }
  }

  console.log('All admin permissions updated successfully!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
