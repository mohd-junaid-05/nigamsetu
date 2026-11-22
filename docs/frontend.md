# Spec 04: Frontend

## Pages & Routes

| Route | Purpose | Auth |
|---|---|---|
| `/` | Landing + public map view | None |
| `/report` | Submit complaint (PWA) | Citizen (phone OTP) |
| `/dashboard` | Official controller dashboard | Official / Admin |
| `/complaint/[id]` | Detail view: timeline, photos, verification, escalation | Citizen (own) / Official (ward) |
| `/escalation/[id]` | View generated escalation letter | Citizen (own) / Official (ward) |
| `/map` | Full-screen public map | None |

## Component Inventory

### Citizen Flow

```
ReportPage
├── CameraCapture          // getUserMedia, capture photo, preview
├── LocationPicker         // GPS auto + manual override, OSM tile display
├── CategorySelector       // 6 category cards with icons
├── VoiceInput             // Optional: record -> Whisper STT
├── SeverityPreview        // Show AI severity score with reason after upload
├── SubmitButton           // Uploads image to Storage, creates complaint
└── SuccessScreen          // Complaint ID, map link, expected timeline
```

### Public Map

```
PublicMapPage
├── LeafletMap             // Full viewport, OSM tiles
├── ComplaintMarkers       // Clustered at zoom < 14, individual at >= 14
├── MarkerPopup            // Thumbnail, category, severity badge, status, date
├── Legend                 // Colour meaning: status + severity
├── FilterBar              // Category toggle, status toggle, date range
└── StatsBanner            // Total open / resolved this month / avg resolution time
```

### Official Dashboard

```
DashboardPage
├── PriorityQueue          // Table: severity | attestations | age | SLA | action
├── MapPanel               // Same map, filtered to ward, with assignment tool
├── AssignmentModal        // Select facility -> confirm -> notify
├── VerificationPanel      // Before/after side-by-side, AI score, approve/reject
├── EscalationQueue        // SLA-breached items, one-click generate letter
├── ChatPanel              // NL query input -> structured answer display
└── StatsCards             // Ward-level KPIs
```

## Key UI Decisions

**Citizen side is mobile-first.** The report flow is a single-column vertical scroll. Camera is full-width. Submit is a sticky bottom button. No hamburger menu -- just three tabs: Report | My Complaints | Map.

**Official side is desktop-first.** Dashboard is a 3-panel layout: queue on the left (25%), map in the center (50%), details/chat on the right (25%). All three scroll independently.

**Severity is always visible.** Every complaint card, marker, and table row shows a severity indicator -- not as a number but as a label + colour: "Cosmetic" (grey), "Significant" (amber), "Critical" (red), "Emergency" (red + pulse icon).

**Status colours are absolute.** Open = red, Assigned = amber, In Progress = blue, Resolved = grey (not green -- green is only for VERIFIED), Escalated = purple, Verified = green. A resolved but unverified complaint stays grey until the citizen or AI confirms it.

**Before/After verification is the hero interaction.** When an official opens a resolved complaint, they see the before image on the left, the after image on the right, the AI score bar in the middle, and three buttons: "Verify & Close", "Reject & Reopen", "Flag for Review". This is the interaction that wins demos.

## PWA Configuration

```typescript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

module.exports = withPWA({
  // ...existing config
});
```

```json
// public/manifest.json
{
  "name": "NigamSetu - Civic Fix Tracker",
  "short_name": "NigamSetu",
  "start_url": "/report",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192" },
    { "src": "/icon-512.png", "sizes": "512x512" }
  ]
}
```

## Clerk Integration

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher(['/dashboard', '/report', '/complaint/(.*)']);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) auth().protect();
});

// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

## Supabase Realtime (Live Dashboard)

```typescript
// hooks/useLiveComplaints.ts
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export function useLiveComplaints(wardId: string, callback: (payload: any) => void) {
  useEffect(() => {
    const channel = supabase
      .channel('complaints')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'complaints', filter: `ward_id=eq.${wardId}` },
        callback
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [wardId]);
}
```

When a citizen submits a complaint, the official dashboard updates within seconds. No page refresh.

## Tailwind Config Extensions

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        severity: {
          1: '#9ca3af', // cosmetic - grey
          2: '#f59e0b', // significant - amber
          3: '#ef4444', // critical - red
          4: '#dc2626', // emergency - darker red
        },
        status: {
          open: '#ef4444',
          assigned: '#f59e0b',
          in_progress: '#3b82f6',
          resolved: '#6b7280',
          verified: '#22c55e',
          escalated: '#a855f7',
        }
      }
    }
  }
};
```
