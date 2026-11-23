import Link from 'next/link';
import { Suspense } from 'react';
import { getServerSession } from '@/lib/auth/session';
import {
  MapPin, AlertTriangle, ArrowRight, ShieldCheck,
  CheckCircle2, FileText, Building2, Zap, Eye,
  TrendingUp, Clock, Users, ChevronRight,
  Construction, Trash2, Droplets, GraduationCap, HeartPulse, Wrench,
} from 'lucide-react';
import { PublicMapContainer } from '@/components/map/PublicMapContainer';

// ─── Live Metrics Strip (NASA-style glassmorphism) ────────────────────────────
async function LiveMetricsStrip() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 py-4">
      <div className="metric-pill flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span>Live System Active</span>
      </div>
      <div className="metric-pill flex items-center gap-2">
        <TrendingUp className="w-3.5 h-3.5 text-green-400" />
        <span>AI Vision Verification</span>
      </div>
      <div className="metric-pill flex items-center gap-2">
        <MapPin className="w-3.5 h-3.5 text-amber-300" />
        <span>Hyderabad Municipal Wards (GHMC)</span>
      </div>
      <div className="metric-pill flex items-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
        <span>Evidence-Based Only</span>
      </div>
    </div>
  );
}

// ─── Session Identity (compact) ───────────────────────────────────────────────
async function SessionFooter() {
  const session = await getServerSession();
  return (
    <footer className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground border-t border-border pt-4 mt-2">
      <div className="flex items-center gap-2">
        <span
          data-testid="server-role-display"
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-xs font-medium bg-surface border border-border capitalize text-foreground"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${session.isAuthenticated ? 'bg-status-verified' : 'bg-slate-400'}`}
          />
          {session.role}
          {session.wardId ? ` · ${session.wardId}` : ' · All Wards'}
        </span>
        <span className="hidden sm:inline">Server-verified session claim</span>
      </div>
      <span className="font-medium text-foreground">
        {session.isAuthenticated ? 'Authenticated Civic User' : 'Public Explorer (Read-Only)'}
      </span>
    </footer>
  );
}

// ─── Task Cards (GOV.UK pattern) ─────────────────────────────────────────────
interface TaskCardItem {
  href: string;
  icon: any;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  cta: string;
  ctaColor: string;
  highlight: boolean;
  officialOnly?: boolean;
}

const TASK_CARDS: TaskCardItem[] = [
  {
    href: '/report',
    icon: AlertTriangle,
    iconColor: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-50 dark:bg-amber-900/20',
    title: 'Report an Issue',
    description: 'Submit a road defect, drainage blockage, sanitation hazard, or public infrastructure complaint with photographic evidence.',
    cta: 'File a complaint',
    ctaColor: 'text-[#071D49] dark:text-blue-300',
    highlight: true,
  },
  {
    href: '/map',
    icon: MapPin,
    iconColor: 'text-[#1d70b8] dark:text-blue-300',
    iconBg: 'bg-blue-50 dark:bg-blue-900/20',
    title: 'View Public Map',
    description: 'Explore all active complaints across Hyderabad wards (GHMC). Live GIS pins with status, severity, and resolution tracking.',
    cta: 'Open live map',
    ctaColor: 'text-[#1d70b8] dark:text-blue-300',
    highlight: false,
  },
  {
    href: '/dashboard',
    icon: ShieldCheck,
    iconColor: 'text-blue-700 dark:text-blue-300',
    iconBg: 'bg-blue-50 dark:bg-blue-900/20',
    title: 'Official Operations',
    description: 'Ward officials review priority queue, assign facilities, verify resolutions, and manage escalations from one dashboard.',
    cta: 'Go to dashboard',
    ctaColor: 'text-[#071D49] dark:text-blue-300',
    highlight: false,
    officialOnly: true,
  },
  {
    href: '/facility',
    icon: Building2,
    iconColor: 'text-emerald-700 dark:text-emerald-300',
    iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
    title: 'Facility Depot',
    description: 'Municipal contractors see assigned work orders, upload repair proof, and log GPS-stamped resolution evidence.',
    cta: 'Open depot',
    ctaColor: 'text-emerald-700 dark:text-emerald-300',
    highlight: false,
    officialOnly: true,
  },
  {
    href: '/admin/traces',
    icon: Eye,
    iconColor: 'text-purple-700 dark:text-purple-300',
    iconBg: 'bg-purple-50 dark:bg-purple-900/20',
    title: 'AI Transparency',
    description: 'Every AI decision — severity scoring, duplicate detection, resolution verification — is fully auditable with evidence traces.',
    cta: 'View audit logs',
    ctaColor: 'text-purple-700 dark:text-purple-300',
    highlight: false,
    officialOnly: true,
  },
];

// ─── How It Works Steps ───────────────────────────────────────────────────────
const HOW_IT_WORKS = [
  { step: '01', title: 'Citizen Files Report', desc: 'Photo + GPS + category captured on mobile. Submitted instantly.' },
  { step: '02', title: 'AI Scores Severity', desc: 'Gemini Vision analyzes the image. Severity 1–4 assigned with reasoning.' },
  { step: '03', title: 'Official Reviews & Assigns', desc: 'Ward official sees priority queue, assigns nearest facility depot.' },
  { step: '04', title: 'Repair Uploaded', desc: 'Contractor uploads after-photo with GPS. Timestamp validated.' },
  { step: '05', title: 'AI Verifies Fix', desc: '4-point check: GPS match, perceptual hash, vision comparison, timestamp.' },
  { step: '06', title: 'Ticket Closed or Escalated', desc: 'Verified → closed. Fake/failed → RTI letter generated automatically.' },
];

// ─── Municipal Sectors with Real Imagery ──────────────────────────────────────
const MUNICIPAL_SECTORS = [
  {
    title: 'Roads & Potholes',
    desc: 'Tarmac cave-ins, cratered asphalt, broken pavements',
    image: '/images/category-road.webp',
    icon: Construction,
    category: 'road',
  },
  {
    title: 'Garbage & Waste',
    desc: 'Overflowing bins, illegal garbage dumps, animal waste',
    image: '/images/category-garbage.webp',
    icon: Trash2,
    category: 'garbage',
  },
  {
    title: 'Drainage & Sewage',
    desc: 'Stormwater overflow, blocked gutters, open manholes',
    image: '/images/category-sewage.webp',
    icon: Droplets,
    category: 'sewage',
  },
  {
    title: 'School Infrastructure',
    desc: 'Classroom defects, broken boundary walls, hygiene facilities',
    image: '/images/category-school.webp',
    icon: GraduationCap,
    category: 'school',
  },
  {
    title: 'Primary Health Clinics',
    desc: 'Dispensary maintenance, water supply, structural hazards',
    image: '/images/category-health.webp',
    icon: HeartPulse,
    category: 'healthcenter',
  },
  {
    title: 'Municipal Field Operations',
    desc: 'GHMC active circle maintenance and depot response crews',
    image: '/images/civic-action.webp',
    icon: Wrench,
    category: 'other',
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function HomePage() {
  const session = await getServerSession();
  const isOfficial =
    session.isAuthenticated &&
    (session.role === 'admin' || session.role === 'official' || session.role === 'facility');
  const visibleCards = TASK_CARDS.filter((c) => !c.officialOnly || isOfficial);

  return (
    <div className="flex-1 flex flex-col">

      {/* ═══ HERO SECTION — Authoritative Hyderabad Municipal Platform ═══════════════ */}
      <section className="relative overflow-hidden bg-[#071D49] dark:bg-black min-h-[500px] flex items-center">
        {/* Hyderabad Cityscape Photo Layer (strictly positioned behind text) */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
          <img
            src="/images/hero-cityscape.webp"
            alt="Hyderabad Charminar Heritage Cityscape"
            className="w-full h-full object-cover object-center opacity-30 filter saturate-150"
          />
          {/* Civic navy and black gradient wash */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#071D49] via-[#071D49]/90 to-[#071D49]/70 dark:from-black dark:via-black/90 dark:to-black/80" />
        </div>

        {/* Hero Foreground Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-14 sm:py-20">
          <div className="max-w-3xl">
            {/* Eyebrow Label */}
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-1 rounded bg-[#FFB81D]" />
              <span className="text-[#FFB81D] text-xs font-bold uppercase tracking-widest font-mono">
                Municipal Infrastructure Platform · Hyderabad (GHMC)
              </span>
            </div>

            {/* H1 Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.08] mb-5">
              Report. Track.
              <br />
              <span className="text-[#FFB81D]">Verify Fixed.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-white/80 leading-relaxed mb-8 max-w-2xl font-medium">
              Citizen grievance filing with AI-verified photographic evidence. Repairs must pass 4-point visual and spatial audit before ticket closure across Hyderabad municipal wards.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/report"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#FFB81D] text-[#071D49] font-bold text-sm rounded hover:bg-amber-300 active:scale-[0.98] transition-all shadow-lg shadow-black/20 focus-visible:ring-2 focus-visible:ring-white"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Report an Issue</span>
              </Link>
              <Link
                href="/map"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-white/10 hover:bg-white/15 active:scale-[0.98] backdrop-blur border border-white/20 text-white font-semibold text-sm rounded transition-all"
              >
                <MapPin className="w-4 h-4 text-[#FFB81D]" />
                <span>View Live Map</span>
              </Link>
              {isOfficial && (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-5 py-3.5 bg-white/5 hover:bg-white/10 text-white/90 text-sm font-semibold rounded border border-white/10 transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-blue-300" />
                  <span>Official Ops</span>
                </Link>
              )}
            </div>
          </div>

          {/* Live Metrics Strip */}
          <div className="mt-12 pt-8 border-t border-white/15">
            <Suspense fallback={null}>
              <LiveMetricsStrip />
            </Suspense>
          </div>
        </div>
      </section>

      {/* ═══ MUNICIPAL SECTORS — Photographic Showcase ════════════════════════ */}
      <section className="section-band bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <span className="gold-accent-bar mb-3" />
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Municipal Infrastructure Sectors
            </h2>
            <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">
              Tracked, assigned, and verified across all Hyderabad municipal ward depots with PostGIS routing.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {MUNICIPAL_SECTORS.map((sec) => {
              const Icon = sec.icon;
              return (
                <div
                  key={sec.title}
                  className="group bg-surface border border-border rounded-lg overflow-hidden shadow-xs hover:border-[#1d70b8] transition-all flex flex-col"
                >
                  <div className="relative h-40 w-full overflow-hidden bg-muted/20">
                    <img
                      src={sec.image}
                      alt={sec.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-103"
                    />
                    <div className="absolute top-2.5 left-2.5 px-2 py-1 rounded bg-[#071D49]/90 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                      <Icon className="w-3.5 h-3.5 text-[#FFB81D]" />
                      <span>{sec.title}</span>
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-sm text-foreground mb-1">
                        {sec.title}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {sec.desc}
                      </p>
                    </div>
                    <Link
                      href="/report"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#1d70b8] dark:text-blue-400 hover:underline pt-2 border-t border-border"
                    >
                      <span>Report {sec.title}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS — Colorado.gov modular banding ══════════════════════ */}
      <section className="section-band-alt">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="gold-accent-bar mb-3" />
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              How It Works
            </h2>
            <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">
              A six-step evidence chain from citizen report to verified resolution — no ghost closures.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <div key={step} className="bg-surface border border-border rounded-lg p-5 flex gap-4">
                <div className="shrink-0 w-9 h-9 rounded bg-[#071D49] dark:bg-[#1d70b8] text-[#FFB81D] dark:text-white flex items-center justify-center font-black text-sm">
                  {step}
                </div>
                <div>
                  <div className="font-bold text-sm text-foreground mb-1">{title}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TASK GRID — GOV.UK citizen services grid ═════════════════════════ */}
      <section className="section-band bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="gold-accent-bar mb-3" />
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Services &amp; Access Points
            </h2>
            <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">
              Select a service below to get started. Each section is role-scoped — citizens, officials, and contractors see what they need.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleCards.map(({ href, icon: Icon, iconColor, iconBg, title, description, cta, ctaColor, highlight }) => (
              <Link
                key={href}
                href={href}
                className={`task-card group flex flex-col gap-4 no-underline ${
                  highlight ? 'ring-2 ring-[#FFB81D] border-[#FFB81D]/40' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`shrink-0 w-10 h-10 rounded flex items-center justify-center ${iconBg}`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-foreground leading-tight">{title}</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed flex-1">{description}</p>
                <div className={`flex items-center gap-1 text-xs font-semibold ${ctaColor} group-hover:gap-2 transition-all`}>
                  <span>{cta}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ LIVE MAP PREVIEW — embedded section ══════════════════════════════ */}
      <section className="section-band-alt">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <span className="gold-accent-bar mb-2" />
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                Live Incident Map
              </h2>
              <p className="text-xs text-muted-foreground mt-1">Realtime ward GIS data · Public read access · No sign-in required</p>
            </div>
            <Link
              href="/map"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded bg-[#071D49] dark:bg-[#1d70b8] text-white text-xs font-semibold hover:bg-[#093692] dark:hover:bg-[#1557a0] transition-colors"
            >
              Full Map
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="rounded-lg overflow-hidden border-2 border-border shadow-md">
            <Suspense
              fallback={
                <div className="w-full h-[480px] bg-surface flex items-center justify-center text-sm text-muted-foreground animate-pulse">
                  <div className="flex flex-col items-center gap-2">
                    <MapPin className="w-8 h-8 opacity-30" />
                    <span>Loading Live Map…</span>
                  </div>
                </div>
              }
            >
              <PublicMapContainer viewMode="embedded" />
            </Suspense>
          </div>
        </div>
      </section>

      {/* ═══ TRUST / COMPLIANCE BAND ══════════════════════════════════════════ */}
      <section className="bg-[#071D49] dark:bg-black py-10 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { icon: ShieldCheck, label: 'Evidence-Based', sub: 'Every closure has photo proof' },
              { icon: Eye, label: 'Fully Auditable', sub: 'AI decisions are traceable' },
              { icon: Clock, label: 'SLA Tracked', sub: 'Automatic escalation on breach' },
              { icon: Users, label: 'Multi-Role', sub: 'Citizen · Official · Facility' },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#FFB81D]" />
                </div>
                <div className="font-bold text-sm text-white">{label}</div>
                <div className="text-xs text-white/55 leading-relaxed">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FOOTER SESSION BAR ═══════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-4">
        <Suspense
          fallback={
            <div className="text-xs text-muted-foreground animate-pulse border-t border-border pt-4">
              Loading session…
            </div>
          }
        >
          <SessionFooter />
        </Suspense>
      </div>
    </div>
  );
}
