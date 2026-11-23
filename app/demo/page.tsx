import React, { Suspense } from 'react';
import { DemoWalkthroughPlayer } from '@/components/demo/DemoWalkthroughPlayer';
import { Video, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

export default function DemoPage() {
  return (
    <div className="flex-1 bg-surface py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-12 text-xs text-muted-foreground">
              Loading demo presentation engine...
            </div>
          }
        >
          <DemoWalkthroughPlayer />
        </Suspense>

        {/* Demo Cheat Sheet / Quick Reference */}
        <section className="bg-surface-card border border-border rounded-2xl p-6">
          <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Judge & Evaluator Demo Verification Matrix</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-surface border border-border space-y-1.5">
              <span className="font-semibold text-foreground">1. Ghost Closures (AI Rejection)</span>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Open complaints #13000000...0003, #13000000...0005, or #13000000...0006 on the dashboard. Click &ldquo;Why this score?&rdquo; to see GPS mismatch (&gt;100m) or perceptual hash fraud flagged.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-border space-y-1.5">
              <span className="font-semibold text-foreground">2. Duplicate Clustering</span>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Check Outer Ring Road Bellandur on the public map or dashboard. Single representative pin shows badge &ldquo;4 reports&rdquo; with 4x elevated priority weight.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-border space-y-1.5">
              <span className="font-semibold text-foreground">3. Escalation Autopilot & Chat</span>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Ticket #13000000...0001 has statutory RTI letter PDF generated. Ask the ward chat &ldquo;Which potholes are pending over 48 hours?&rdquo; to see live SQL transparency.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
