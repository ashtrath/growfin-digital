import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { DomainClient } from './DomainClient';

export const dynamic = 'force-dynamic';

export default async function DomainPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: businesses } = await supabase
    .from('business_demos')
    .select('id, name, slug, category, status, package_tier, custom_domain, site_active_until, domain_active_until')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-2xl md:text-3xl font-black text-white">Domain Kustom</h2>
        <p className="text-[#8E8EA0] mt-1 text-sm md:text-base">
          Hubungkan domain kustom Anda (.com, .id, .co.id) atau gunakan domain bawaan Growfin untuk bisnis Anda.
        </p>
      </div>

      <DomainClient businesses={businesses || []} />
    </div>
  );
}
