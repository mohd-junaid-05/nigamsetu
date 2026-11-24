'use client';

import React from 'react';
import { useTheme } from './ThemeContext';
import { Sun, Moon, Laptop } from 'lucide-react';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme, mounted } = useTheme();

  // During SSR and initial client hydration, activeTheme is strictly 'system'.
  const activeTheme = mounted ? theme : 'system';

  const cycleTheme = () => {
    if (activeTheme === 'light') {
      setTheme('dark');
    } else if (activeTheme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getIcon = () => {
    if (activeTheme === 'light') return <Sun className="w-4 h-4 text-amber-300" />;
    if (activeTheme === 'dark') return <Moon className="w-4 h-4 text-sky-300" />;
    return <Laptop className="w-4 h-4 text-white/80" />;
  };

  const getLabel = () => {
    if (activeTheme === 'light') return 'Theme: Light (Click to switch)';
    if (activeTheme === 'dark') return 'Theme: Dark (Click to switch)';
    return 'Theme: System (Click to switch)';
  };

  return (
    <button
      type="button"
      onClick={cycleTheme}
      title={getLabel()}
      aria-label={getLabel()}
      className={`p-2 rounded-md text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center cursor-pointer ${className}`}
    >
      {getIcon()}
    </button>
  );
}
