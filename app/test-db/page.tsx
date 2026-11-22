'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle2, XCircle, RefreshCw, Database, ArrowLeft, ShieldCheck, Copy, Check } from 'lucide-react';

type TestCheckResult = {
  checkNumber: number;
  title: string;
  passed: boolean;
  expected: string;
  actual: string;
  details?: unknown;
};

type AcceptanceTestResponse = {
  success: boolean;
  databaseConnected: boolean;
  message: string;
  checks: TestCheckResult[];
};

export default function TestDbPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AcceptanceTestResponse | null>(null);
  const [copiedMigration, setCopiedMigration] = useState(false);
  const [copiedSeed, setCopiedSeed] = useState(false);

  const runTests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/test-db');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to run test-db', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  const copyPath = (text: string, type: 'migration' | 'seed') => {
    navigator.clipboard.writeText(text);
    if (type === 'migration') {
      setCopiedMigration(true);
      setTimeout(() => setCopiedMigration(false), 2000);
    } else {
      setCopiedSeed(true);
      setTimeout(() => setCopiedSeed(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <span className="text-xs font-mono px-2.5 py-1 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 rounded-full font-medium">
            Phase 02 Acceptance Verification
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Database & Row-Level Security Verification</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Supabase Project: <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">xlagdiqtedflkigftwov</code>
                </p>
              </div>
            </div>

            <button
              onClick={runTests}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Run Checks
            </button>
          </div>

          {/* Instructions Box */}
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg p-4 text-sm text-amber-900 dark:text-amber-200 space-y-2">
            <p className="font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Running Migrations in Supabase Dashboard
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Open your Supabase dashboard at{' '}
              <a
                href="https://supabase.com/dashboard/project/xlagdiqtedflkigftwov/sql/new"
                target="_blank"
                rel="noreferrer"
                className="underline font-semibold"
              >
                SQL Editor
              </a>{' '}
              and execute the generated migration files:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-3 py-2 rounded border border-amber-200 dark:border-amber-900/60 text-xs font-mono">
                <span className="truncate">supabase/migrations/20260301000000_phase_02_schema_and_rls.sql</span>
                <button
                  onClick={() =>
                    copyPath(
                      'supabase/migrations/20260301000000_phase_02_schema_and_rls.sql',
                      'migration'
                    )
                  }
                  className="ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  {copiedMigration ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-3 py-2 rounded border border-amber-200 dark:border-amber-900/60 text-xs font-mono">
                <span className="truncate">supabase/seed.sql</span>
                <button
                  onClick={() => copyPath('supabase/seed.sql', 'seed')}
                  className="ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  {copiedSeed ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Test Results */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <p className="text-sm">Evaluating Row-Level Security and PostGIS queries...</p>
            </div>
          ) : data ? (
            <div className="space-y-4 pt-2">
              <div
                className={`p-3 rounded-lg text-sm font-medium flex items-center justify-between ${
                  data.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                <span>{data.message}</span>
                <span className="text-xs uppercase tracking-wider font-bold">
                  {data.success ? 'ACCEPTED' : 'PENDING SQL RUN'}
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.checks.map((check) => (
                  <div key={check.checkNumber} className="py-3 flex items-start gap-3">
                    {check.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1 flex-1 text-sm">
                      <div className="font-semibold">{check.title}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-medium">Expected:</span> {check.expected}
                      </div>
                      <div className="text-xs text-slate-700 dark:text-slate-300">
                        <span className="font-medium">Actual:</span> {check.actual}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
