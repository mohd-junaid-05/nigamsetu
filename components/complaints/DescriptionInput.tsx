'use client';

import React from 'react';
import { Mic, Info } from 'lucide-react';

interface DescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function DescriptionInput({
  value,
  onChange,
  disabled = false,
}: DescriptionInputProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor="complaint-description"
          className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5"
        >
          <span>Issue Description</span>
          <span className="text-muted-foreground font-normal lowercase">(optional)</span>
        </label>
        <span className="text-[11px] font-mono text-muted-foreground">
          {value.length}/500
        </span>
      </div>

      <div className="relative">
        <textarea
          id="complaint-description"
          value={value}
          maxLength={500}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder="E.g., 2-foot pothole in the middle lane right opposite the municipal primary school..."
          rows={3}
          className="w-full text-xs p-3 rounded-xl border border-border bg-surface-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors resize-none disabled:opacity-50"
        />

        {/* Voice recording UI Slot (Phase 3 spec: leave UI slot) */}
        <div className="mt-2 flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Info className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Clear photos provide sufficient proof for AI severity scoring.</span>
          </div>

          <button
            type="button"
            disabled
            title="Voice notes will be activated in v2 (Whisper STT)"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/80 bg-surface text-muted-foreground text-[10px] font-medium opacity-70 cursor-not-allowed"
          >
            <Mic className="w-3 h-3" />
            <span>Voice Note (v2)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
