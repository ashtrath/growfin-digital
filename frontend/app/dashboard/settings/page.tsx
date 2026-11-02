import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Edit3, ArrowRight, Store } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SettingsPage(props: {
  searchParams: Promise<{ id?: string }>;
}) {
  const searchParams = await props.searchParams;
  const businessId = searchParams.id;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: allBusinesses } = await supabase
    .from('business_demos')
    .select('id, name, slug, category, city')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (!allBusinesses || allBusinesses.length === 0) {
    redirect('/dashboard');
  }

  // Jika ada ID spesifik atau hanya ada 1 bisnis, langsung arahkan ke Live Editor terpusat
  const targetBusiness = businessId
    ? allBusinesses.find((b) => b.id === businessId) || allBusinesses[0]
    : allBusinesses[0];

  if (allBusinesses.length === 1 || businessId) {
    redirect(`/demo/${targetBusiness.slug}`);
  }

  // Jika memiliki banyak bisnis dan belum memilih, tampilkan hub navigasi ke Live Editor
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl md:text-3xl font-black text-white">Pusat Kelola Website & Menu</h2>
        <p className="text-[#8E8EA0] mt-1 text-sm md:text-base">
          Seluruh pengelolaan informasi bisnis, daftar produk/layanan, foto hero, tema warna, promo, dan urutan seksi kini dikelola secara terpusat langsung di Live Editor interaktif.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allBusinesses.map((b) => (
          <div 
            key={b.id} 
            className="bg-[#14141A] border border-[#262633] hover:border-[#00b894]/50 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#00b894]/10 border border-[#00b894]/20 flex items-center justify-center text-[#00b894] mb-3">
                <Store className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-white">{b.name}</h3>
              <p className="text-xs text-[#8E8EA0] mt-0.5">
                {b.category} {b.city ? `• ${b.city}` : ''}
              </p>
            </div>

            <Link
              href={`/demo/${b.slug}`}
              className="w-full py-2.5 px-4 bg-white hover:bg-gray-100 text-black font-extrabold rounded-xl transition-all text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Buka Live Editor Terpusat</span>
              <ArrowRight className="w-3.5 h-3.5 ml-auto text-gray-500" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
