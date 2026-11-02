import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { ThemeClient } from './ThemeClient';

export const dynamic = 'force-dynamic';

export default async function ThemePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: businesses } = await supabase
    .from('business_demos')
    .select('id, name, slug, category, status, package_tier, layout_id, metadata, draft_metadata')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-2xl md:text-3xl font-black text-white">Tampilan & Tema</h2>
        <p className="text-[#8E8EA0] mt-1 text-sm md:text-base">
          Sesuaikan gaya visual, skema warna brand, dan tata letak website bisnis Anda.
        </p>
      </div>

      <ThemeClient businesses={businesses || []} />
    </div>
  );
}
