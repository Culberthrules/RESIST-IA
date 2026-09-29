import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RESIST-IA — Sign In',
  description: 'Sign in to your RESIST-IA surveillance dashboard',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary-600/10 blur-[120px] pulse-glow" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent-500/8 blur-[100px] pulse-glow" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-purple-500/6 blur-[80px] pulse-glow" style={{ animationDelay: '0.75s' }} />
      
      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8 fade-in">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold gradient-text">RESIST-IA</h1>
          </div>
          <p className="text-surface-400 text-sm">
            Antimicrobial Resistance Surveillance Platform
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-8 fade-in stagger-2">
          {children}
        </div>

        <p className="text-center text-surface-500 text-xs mt-6 fade-in stagger-3">
          Laboratory data is scoped and protected by row-level security.
        </p>
      </div>
    </div>
  );
}
