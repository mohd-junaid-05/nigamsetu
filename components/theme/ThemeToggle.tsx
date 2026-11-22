'use client';

import React from 'react';
import { useTheme, type Theme } from './ThemeContext';
import { Sun, Moon, Laptop } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme, mounted } = useTheme();

  const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun className="w-3.5 h-3.5" /> },
    { value: 'system', label: 'System', icon: <Laptop className="w-3.5 h-3.5" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="w-3.5 h-3.5" /> },
  ];

  // During SSR and initial client hydration, activeTheme is strictly 'system'.
  // Only after client mount does it reflect the user's stored theme, preventing hydration mismatch.
  const activeTheme = mounted ? theme : 'system';

  return (
    <div
      role="radiogroup"
      aria-label="Theme selector"
      suppressHydrationWarning
      className="inline-flex items-center p-1 rounded-lg border border-border bg-surface text-foreground"
    >
      {options.map((option) => {
        const isSelected = activeTheme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            suppressHydrationWarning
            aria-checked={isSelected}
            onClick={() => setTheme(option.value)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              isSelected
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title={`Switch to ${option.label} theme`}
          >
            {option.icon}
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
