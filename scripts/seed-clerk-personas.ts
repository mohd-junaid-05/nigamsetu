import { clerkClient } from '@clerk/nextjs/server';

export async function seedClerkPersonas() {
  console.log('--- Seeding Clerk Demo Personas ---');
  const c = await clerkClient();
  const personas = [
    {
      email: 'demo.citizen@nigamsetu.gov.in',
      password: 'DemoPassword2026!',
      first: 'Aarav',
      last: 'Sharma (Citizen)',
      role: 'citizen',
      wardId: null,
    },
    {
      email: 'demo.official.bellandur@nigamsetu.gov.in',
      password: 'DemoPassword2026!',
      first: 'Ramesh',
      last: 'Kumar (Banjara Hills Official)',
      role: 'official',
      wardId: 'a0000000-0000-0000-0000-000000000001',
    },
    {
      email: 'demo.official.hsr@nigamsetu.gov.in',
      password: 'DemoPassword2026!',
      first: 'Priya',
      last: 'Nair (Gachibowli Official)',
      role: 'official',
      wardId: 'a0000000-0000-0000-0000-000000000002',
    },
    {
      email: 'demo.official.koramangala@nigamsetu.gov.in',
      password: 'DemoPassword2026!',
      first: 'Suresh',
      last: 'Reddy (Charminar Official)',
      role: 'official',
      wardId: 'a0000000-0000-0000-0000-000000000003',
    },
    {
      email: 'demo.admin@nigamsetu.gov.in',
      password: 'DemoPassword2026!',
      first: 'Chief Commissioner',
      last: 'GHMC Admin',
      role: 'admin',
      wardId: null,
    },
  ];

  const results: Record<string, string> = {};

  for (const p of personas) {
    try {
      // Check if user already exists
      const existing = await c.users.getUserList({
        emailAddress: [p.email],
      });

      if (existing.totalCount > 0) {
        const u = existing.data[0];
        console.log(`User already exists: ${p.email} (${u.id}). Updating metadata...`);
        await c.users.updateUserMetadata(u.id, {
          publicMetadata: {
            role: p.role,
            ward_id: p.wardId,
          },
        });
        results[p.role + (p.wardId ? `_${p.wardId.slice(-4)}` : '')] = u.id;
      } else {
        const u = await c.users.createUser({
          emailAddress: [p.email],
          password: p.password,
          firstName: p.first,
          lastName: p.last,
          publicMetadata: {
            role: p.role,
            ward_id: p.wardId,
          },
        });
        console.log(`Created new Clerk user: ${p.email} (${u.id})`);
        results[p.role + (p.wardId ? `_${p.wardId.slice(-4)}` : '')] = u.id;
      }
    } catch (err: any) {
      console.warn(`Error handling ${p.email}:`, err.errors?.[0]?.message || err.message);
    }
  }

  return results;
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('seed-clerk-personas')) {
  seedClerkPersonas()
    .then((res) => {
      console.log('Seeded Clerk Personas:', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
