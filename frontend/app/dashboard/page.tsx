import { createClient } from '@/utils/supabase/server';
import { Store, Activity, MessageCircle, Eye } from 'lucide-react';
import { CreateWebsiteButton } from '@/components/dashboard/CreateWebsiteButton';
import { BusinessCard } from '@/components/dashboard/BusinessCard';

export default async function DashboardOverview() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch the user's businesses with visual metadata & expiration timestamps
  const { data: businesses } = await supabase
    .from('business_demos')
    .select('id, name, slug, category, city, status, package_tier, created_at, metadata, draft_metadata, fomo_expires_at, site_active_until, domain_active_until, custom_domain')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false });

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'growfin.my.id';

  // Fetch Analytics Data (both WhatsApp clicks and page views)
  let analyticsData: any[] = [];
  if (businesses && businesses.length > 0) {
    const businessIds = businesses.map(b => b.id);
    const { data: events } = await supabase
      .from('analytics_events')
      .select('business_id, event_type')
      .in('business_id', businessIds);
    
    analyticsData = events || [];
  }

  const totalWaClicks = analyticsData.filter(e => e.event_type === 'whatsapp_click').length;
  const totalPageViews = analyticsData.filter(e => e.event_type === 'page_view').length;
  const conversionRate = totalPageViews > 0 
    ? ((totalWaClicks / totalPageViews) * 100).toFixed(1) 
    : '0.0';

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h2 className="text-2xl md:text-3xl font-black text-white">Ringkasan Bisnis</h2>
        <p className="text-[#8E8EA0] mt-1 text-xs md:text-sm">Pantau status website dan layanan bisnis digital Anda di sini.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-[#14141A] border border-[#262633] rounded-2xl p-5 md:p-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-[#00b894]/20 rounded-xl flex items-center justify-center shrink-0">
              <Store className="w-6 h-6 text-[#00b894]" />
            </div>
            <div>
              <p className="text-[#8E8EA0] text-xs md:text-sm font-semibold">Total Website Aktif</p>
              <h3 className="text-xl md:text-2xl font-black text-white">{businesses?.filter(b => b.status === 'published' || b.status === 'paid').length || 0}</h3>
            </div>
          </div>
        </div>

        <div className="bg-[#14141A] border border-[#262633] rounded-2xl p-5 md:p-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
              <Eye className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-[#8E8EA0] text-xs md:text-sm font-semibold">Total Pengunjung (Views)</p>
              <h3 className="text-xl md:text-2xl font-black text-white">{totalPageViews}</h3>
            </div>
          </div>
        </div>

        <div className="bg-[#14141A] border border-[#262633] rounded-2xl p-5 md:p-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center shrink-0">
              <MessageCircle className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-[#8E8EA0] text-xs md:text-sm font-semibold">Total Prospek (Leads WA)</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-xl md:text-2xl font-black text-white">{totalWaClicks}</h3>
                {totalPageViews > 0 && (
                  <span className="text-[10px] md:text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    {conversionRate}% konversi
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#14141A] border border-[#262633] rounded-2xl p-5 md:p-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center shrink-0">
              <Activity className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <p className="text-[#8E8EA0] text-xs md:text-sm font-semibold">Status Langganan</p>
              <h3 className="text-xl md:text-2xl font-black text-white">Lifetime</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Business List */}
      <div className="bg-[#14141A] border border-[#262633] rounded-2xl overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-[#262633] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-lg sm:text-xl font-bold text-white">Daftar Website Bisnis</h3>
          <CreateWebsiteButton />
        </div>

        {(!businesses || businesses.length === 0) ? (
          <div className="p-8 sm:p-12 text-center">
            <Store className="w-12 h-12 text-[#262633] mx-auto mb-4" />
            <p className="text-[#8E8EA0] text-sm">Anda belum memiliki website bisnis yang aktif.</p>
          </div>
        ) : (
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {businesses.map((biz) => {
              const bizClicks = analyticsData.filter(e => e.business_id === biz.id && e.event_type === 'whatsapp_click').length;
              const bizViews = analyticsData.filter(e => e.business_id === biz.id && e.event_type === 'page_view').length;
              return (
                <BusinessCard
                  key={biz.id}
                  business={biz}
                  views={bizViews}
                  waClicks={bizClicks}
                  rootDomain={rootDomain}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
