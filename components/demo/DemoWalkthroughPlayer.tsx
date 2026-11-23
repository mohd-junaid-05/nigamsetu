'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  FastForward,
  ShieldCheck,
  Smartphone,
  MapPin,
  AlertTriangle,
  FileText,
  MessageSquare,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Clock,
  UserCheck,
} from 'lucide-react';

export interface DemoChapter {
  id: number;
  timeRange: string;
  durationSeconds: number;
  title: string;
  subtitle: string;
  speakerScript: string;
  targetUrl: string;
  targetLabel: string;
  evidencePoints: string[];
}

export const DEMO_CHAPTERS: DemoChapter[] = [
  {
    id: 1,
    timeRange: '0:00 - 0:30 (30s)',
    durationSeconds: 30,
    title: 'The Civic Trust Crisis & Ghost Closures',
    subtitle: 'Indian municipal complaint systems are plagued by fake closures',
    speakerScript:
      'Good morning judges. Every year, millions of civic grievances in Indian cities are marked "Resolved" without a single pothole filled or drain cleaned. Citizens lose faith, while municipal engineers drown in duplicate tickets. NigamSetu solves this by introducing an evidence-based AI verification layer where no complaint can be closed without rigorous cross-evidence proof.',
    targetUrl: '/map',
    targetLabel: 'Open Public Map',
    evidencePoints: [
      'Problem: Phantom fixes ("ghost closures") falsely reported by contractors',
      'Solution: AI verification engine checks GPS, image hashes, and vision evidence',
      'Zero trust by default: RLS policies isolate data; all AI tools log transparent traces',
    ],
  },
  {
    id: 2,
    timeRange: '0:30 - 2:00 (90s)',
    durationSeconds: 90,
    title: 'Citizen Report & Real-time AI Severity Scoring',
    subtitle: 'Mobile PWA camera capture, automatic ward boundary, and Gemini Vision assessment',
    speakerScript:
      'Let us see the citizen experience on mobile. A citizen encounters a deep crater pothole on Outer Ring Road Bellandur. Using the standalone PWA, they snap a live photo. The GPS coordinates automatically place the defect inside Ward 150 Bellandur. Within seconds, Gemini 1.5 Flash evaluates the image, scoring severity 3 with transparent reasoning about vehicular risk.',
    targetUrl: '/report',
    targetLabel: 'Open Submission Screen',
    evidencePoints: [
      'Mobile-first camera capture with 10MB client guardrails',
      'PostGIS ST_Contains automatically maps coordinates to ward boundary',
      'Gemini Vision scores severity 1 to 4 with structured explanation logged to agent_traces',
      'Perceptual DBSCAN detects 4 identical neighbor reports into 1 high-weight cluster',
    ],
  },
  {
    id: 3,
    timeRange: '2:00 - 3:30 (90s)',
    durationSeconds: 90,
    title: 'Municipal Controller Dashboard & PostGIS Routing',
    subtitle: 'Desktop-first 3-panel command center with SLA breach detection',
    speakerScript:
      'Now we switch to the municipal official view for Ward 150. The desktop controller prioritizes issues by severity multiplied by cluster attestations and SLA risk. Tickets breaching statutory deadlines flash in red. Using PostGIS KNN geospatial distance, the official locates the nearest PWD road depot and assigns the ticket with one click.',
    targetUrl: '/dashboard?wardId=a0000000-0000-0000-0000-000000000001',
    targetLabel: 'Open Official Dashboard',
    evidencePoints: [
      '3-panel layout: Priority Queue (25%), Interactive Map (50%), Details Panel (25%)',
      'Calculated SLA deadlines (Sewage 12h, Garbage 24h, Road 72h)',
      'Spatial KNN routing matches nearest category-specific municipal facility',
      'Supabase Realtime streams ticket updates live without browser refresh',
    ],
  },
  {
    id: 4,
    timeRange: '3:30 - 5:00 (90s)',
    durationSeconds: 90,
    title: 'The Fix Verification Moment: Catching Ghost Closures',
    subtitle: 'Four sequential checks reject fake contractor proofs and pass real fixes',
    speakerScript:
      'This is the heart of NigamSetu. A contractor marks a pothole resolved and uploads a proof photo. CivicAgent executes four automated checks. If the photo was taken 300 meters away, GPS fails. If they re-upload the same before photo, DCT perceptual hash fails with Hamming distance under 5. If they upload an unrelated clean road, Gemini Vision rejects it with score 0.20.',
    targetUrl: '/dashboard?wardId=a0000000-0000-0000-0000-000000000001',
    targetLabel: 'Inspect Before/After Verification',
    evidencePoints: [
      'Check 1: Proximity threshold (must be within 100 meters of defect)',
      'Check 2: Timestamp verification (fix must be after complaint creation)',
      'Check 3: Perceptual hash check (Hamming distance < 5 flags re-uploaded before photo)',
      'Check 4: Multi-model Gemini Vision verifies actual physical defect rectification',
      '"Why this score?" modal reveals exact prompt, raw JSON, and check breakdown',
    ],
  },
  {
    id: 5,
    timeRange: '5:00 - 6:00 (60s)',
    durationSeconds: 60,
    title: 'Escalation Autopilot & Natural Language Ward Chat',
    subtitle: 'Statutory RTI appeal letter generation and ward-scoped SQL query agent',
    speakerScript:
      'When a ticket breaches its citizen charter SLA, Escalation Autopilot automatically drafts a formal RTI appeal PDF addressed to the Ward Executive Engineer. Simultaneously, officials can query the ward chat in plain English: "Which road defects are pending over 48 hours?" The agent executes deterministic, ward-scoped SQL and returns cited ticket links.',
    targetUrl: '/dashboard?wardId=a0000000-0000-0000-0000-000000000002',
    targetLabel: 'Open Ward Chat & Escalations',
    evidencePoints: [
      'State-specific municipal appeal templates (Maharashtra & Karnataka RTI formats)',
      'Generated PDF stored in Supabase Storage with download link',
      'NL-to-SQL architecture with strict ward isolation (no cross-ward leakage)',
      'Collapsible SQL audit box ensures complete transparency on every chat reply',
    ],
  },
  {
    id: 6,
    timeRange: '6:00 - 6:30 (30s)',
    durationSeconds: 30,
    title: 'Close & Public Accountability',
    subtitle: 'Public map transparency, live stats, and restoring citizen confidence',
    speakerScript:
      'NigamSetu transforms civic governance from empty closure claims to cryptographic and visual verification. Citizens see verified green pins only when genuine work is done. Every decision is traceable, every SLA is accountable, and civic trust is restored.',
    targetUrl: '/map',
    targetLabel: 'Return to Public Map',
    evidencePoints: [
      '50+ live pins across Bellandur, HSR Layout, and Koramangala',
      'Verified tickets render green; unverified closures remain grey',
      'Complete public auditability with /admin/traces transparency view',
    ],
  },
];

export function DemoWalkthroughPlayer() {
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressSeconds, setProgressSeconds] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [videoSource, setVideoSource] = useState('/demo-video.mp4');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const activeChapter = DEMO_CHAPTERS[activeChapterIndex];

  // Speech synthesis helper
  const speakCurrentScript = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (!ttsEnabled) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = playbackSpeed;
    utterance.lang = 'en-IN';
    window.speechSynthesis.speak(utterance);
  }, [ttsEnabled, playbackSpeed]);

  // Handle Play/Pause
  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.pause();
      }
      if (videoRef.current) {
        videoRef.current.pause();
      }
    } else {
      setIsPlaying(true);
      if (ttsEnabled) {
        speakCurrentScript(activeChapter.speakerScript);
      }
      if (videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  // Chapter selection
  const selectChapter = (index: number) => {
    setActiveChapterIndex(index);
    setProgressSeconds(0);
    if (isPlaying && ttsEnabled) {
      speakCurrentScript(DEMO_CHAPTERS[index].speakerScript);
    }
  };

  // Progress ticker effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setInterval(() => {
        setProgressSeconds((prev) => {
          if (prev >= activeChapter.durationSeconds) {
            // Move to next chapter
            if (activeChapterIndex < DEMO_CHAPTERS.length - 1) {
              const nextIdx = activeChapterIndex + 1;
              setActiveChapterIndex(nextIdx);
              if (ttsEnabled) {
                speakCurrentScript(DEMO_CHAPTERS[nextIdx].speakerScript);
              }
              return 0;
            } else {
              setIsPlaying(false);
              return activeChapter.durationSeconds;
            }
          }
          return prev + 1 * playbackSpeed;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, activeChapter, activeChapterIndex, playbackSpeed, ttsEnabled, speakCurrentScript]);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Top Banner: Video & Synchronized Script Header */}
      <div className="bg-surface-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-600/10 text-blue-600 border border-blue-500/20">
                Phase 13 Demo Engine
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                Total Duration: 6 Minutes (360s)
              </span>
            </div>
            <h1 className="text-2xl font-black text-foreground mt-1">
              6-Minute Live Stage & Backup Video Walkthrough
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
              Complete rehearsal deck with synchronized narration, interactive chapter scrub bar, audio synthesis, and live application deep-links.
            </p>
          </div>

          {/* Quick Persona Launchers */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground mr-1">Switch Persona:</span>
            <Link
              href="/report"
              className="px-2.5 py-1 text-xs rounded-lg bg-surface border border-border hover:bg-surface-hover transition-colors font-medium text-foreground flex items-center gap-1"
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-500" />
              <span>Citizen</span>
            </Link>
            <Link
              href="/dashboard?wardId=a0000000-0000-0000-0000-000000000001"
              className="px-2.5 py-1 text-xs rounded-lg bg-surface border border-border hover:bg-surface-hover transition-colors font-medium text-foreground flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>Official (Bellandur)</span>
            </Link>
            <Link
              href="/dashboard?wardId=a0000000-0000-0000-0000-000000000002"
              className="px-2.5 py-1 text-xs rounded-lg bg-surface border border-border hover:bg-surface-hover transition-colors font-medium text-foreground flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Official (HSR)</span>
            </Link>
            <Link
              href="/admin/traces"
              className="px-2.5 py-1 text-xs rounded-lg bg-surface border border-border hover:bg-surface-hover transition-colors font-medium text-foreground flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              <span>Admin Traces</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main 2-Column Layout: Video / Chapter Visual on Left, Synchronized Script on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Video Player & Live Action Slide */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* HTML5 Backup Video Container */}
          <div className="bg-surface-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
            <div className="relative aspect-video bg-black flex items-center justify-center">
              <video
                ref={videoRef}
                src={videoSource}
                controls
                className="w-full h-full object-cover"
                poster="/icon-512.png"
              >
                Your browser does not support the video tag.
              </video>
            </div>

            {/* Video Controls & Chapter Tracker */}
            <div className="p-4 flex flex-col gap-3 bg-surface-card border-t border-border">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">
                    Chapter {activeChapter.id}: {activeChapter.title}
                  </span>
                  <span className="text-muted-foreground font-mono">({activeChapter.timeRange})</span>
                </div>
                <div className="text-muted-foreground font-mono text-[11px]">
                  {Math.floor(progressSeconds)}s / {activeChapter.durationSeconds}s
                </div>
              </div>

              {/* Chapter Progress Bar */}
              <div className="w-full h-2 bg-surface rounded-full overflow-hidden border border-border">
                <div
                  className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                  style={{
                    width: `${Math.min(100, (progressSeconds / activeChapter.durationSeconds) * 100)}%`,
                  }}
                />
              </div>

              {/* Playback Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlay}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isPlaying ? 'Pause' : 'Play Narration'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setProgressSeconds(0);
                      if (isPlaying && ttsEnabled) speakCurrentScript(activeChapter.speakerScript);
                    }}
                    className="p-1.5 rounded-xl border border-border hover:bg-surface-hover transition-colors text-foreground"
                    title="Restart Chapter"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      setTtsEnabled(!ttsEnabled);
                      if (!ttsEnabled && isPlaying) {
                        speakCurrentScript(activeChapter.speakerScript);
                      } else if (ttsEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
                        window.speechSynthesis.cancel();
                      }
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-xs border font-medium transition-colors flex items-center gap-1 ${
                      ttsEnabled
                        ? 'bg-blue-600/10 text-blue-600 border-blue-500/30'
                        : 'border-border text-muted-foreground hover:bg-surface-hover'
                    }`}
                  >
                    {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                    <span>Voice Synth: {ttsEnabled ? 'ON' : 'OFF'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Speed:</span>
                  {[1, 1.5, 2].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => setPlaybackSpeed(speed)}
                      className={`px-2 py-0.5 text-xs font-mono rounded border transition-colors ${
                        playbackSpeed === speed
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-border text-muted-foreground hover:bg-surface-hover'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Live Action Card: Instant Link to Current Feature Under Demo */}
          <div className="bg-surface-card border border-border rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Live Interactive Surface for Chapter {activeChapter.id}
              </span>
              <Link
                href={activeChapter.targetUrl}
                target="_blank"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                <span>{activeChapter.targetLabel}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {activeChapter.evidencePoints.map((point, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-surface border border-border/70 flex flex-col gap-1.5 text-xs"
                >
                  <div className="flex items-center gap-1.5 text-foreground font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    <span>Point {idx + 1}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): 6-Minute Script Narration & Chapter Stepper */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Chapter Selector Tabs */}
          <div className="bg-surface-card border border-border rounded-2xl p-4 flex flex-col gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Demo Timeline & Chapters (6 min)
            </h2>
            <div className="space-y-1.5">
              {DEMO_CHAPTERS.map((ch, idx) => {
                const isActive = idx === activeChapterIndex;
                return (
                  <button
                    key={ch.id}
                    onClick={() => selectChapter(idx)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                      isActive
                        ? 'bg-blue-600/10 border-blue-500/40 shadow-xs'
                        : 'bg-surface border-border/60 hover:bg-surface-hover'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 flex-shrink-0 ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'bg-muted/20 text-muted-foreground'
                        }`}
                      >
                        {ch.id}
                      </div>
                      <div>
                        <div
                          className={`text-xs font-bold ${
                            isActive ? 'text-blue-600 dark:text-blue-400' : 'text-foreground'
                          }`}
                        >
                          {ch.title}
                        </div>
                        <div className="text-[11px] text-muted-foreground line-clamp-1">
                          {ch.subtitle}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground font-medium flex-shrink-0">
                      {ch.timeRange.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Chapter Speaker Narration Card */}
          <div className="bg-surface-card border border-border rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-foreground">
                  Presenter Narration Script (Word-for-Word)
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-border text-muted-foreground">
                Time: {activeChapter.timeRange}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface border border-border text-xs leading-relaxed text-foreground font-sans italic">
              &ldquo;{activeChapter.speakerScript}&rdquo;
            </div>

            <div className="flex items-center justify-between pt-1 text-xs">
              <Link
                href={activeChapter.targetUrl}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium flex items-center gap-1.5"
              >
                <span>Launch {activeChapter.targetLabel}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>

              {activeChapterIndex < DEMO_CHAPTERS.length - 1 && (
                <button
                  onClick={() => selectChapter(activeChapterIndex + 1)}
                  className="px-3 py-1.5 rounded-lg border border-border hover:bg-surface-hover transition-colors font-medium text-foreground flex items-center gap-1"
                >
                  <span>Next Chapter</span>
                  <FastForward className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
