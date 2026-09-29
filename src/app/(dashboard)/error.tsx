'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="glass-card p-8 max-w-lg mx-auto text-center space-y-4">
      <h2 className="text-xl font-semibold text-surface-100">Something went wrong</h2>
      <p className="text-sm text-surface-400">
        We could not load this page. You can try again or return to the dashboard home.
      </p>
      <button
        type="button"
        onClick={reset}
        className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium"
      >
        Try again
      </button>
    </div>
  );
}
