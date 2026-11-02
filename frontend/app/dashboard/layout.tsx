import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // If not logged in, boot them out to login page
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white">
      <DashboardSidebar userEmail={user.email} />
      <div className="md:pl-64 flex flex-col min-h-screen min-w-0">
        {/* Desktop Top Header (hidden on mobile, replaced by Mobile Top Navbar) */}
        <header className="hidden md:flex h-20 border-b border-[#262633] bg-[#14141A] items-center justify-between px-8 shrink-0">
          <div>
            <h1 className="text-xl font-bold text-white">Halo, Pengusaha!</h1>
            <p className="text-xs text-[#8E8EA0] mt-0.5">Kelola seluruh aspek bisnis dan website Anda di satu tempat.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-bold text-white">{user.email}</p>
              <p className="text-xs text-[#00b894] font-semibold flex items-center justify-end gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00b894] inline-block" />
                Akun Pro
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#262633] border-2 border-[#00b894] flex items-center justify-center text-sm font-bold text-white shadow-sm">
              {user.email?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
