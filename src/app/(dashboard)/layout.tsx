import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RESIST-IA — Dashboard',
  description: 'AMR surveillance dashboard',
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, laboratories(*)')
    .eq('id', user.id)
    .single();

  return (
    <div className="flex h-screen overflow-hidden bg-surface-950">
      <Sidebar
        userName={profile?.full_name ?? user.email ?? 'User'}
        userRole={profile?.role ?? 'technician'}
        labName={(profile?.laboratories as { name?: string })?.name ?? 'Laboratory'}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
