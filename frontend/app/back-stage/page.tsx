import { redirect } from 'next/navigation';
import { createClient as createServerSupabase } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { isAdminEmail } from '@/lib/admin';
import { AccessDeniedScreen } from '@/components/admin/AccessDeniedScreen';
import {
  AdminConsoleClient,
  AdminStats,
  TenantData,
  TransactionData,
} from '@/components/admin/AdminConsoleClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Backstage Console | Growfin Digital',
  description: 'Konsol manajemen Super Admin untuk tenant dan transaksi Growfin Digital.',
};

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Supabase environment variables are missing');
  }

  return createAdminClient(supabaseUrl, serviceKey);
}

export default async function BackstagePage() {
  // 1. Authenticate user from session cookies
  const supabaseUser = await createServerSupabase();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/back-stage');
  }

  // 2. Authorize user against ADMIN_EMAILS
  if (!isAdminEmail(user.email)) {
    return <AccessDeniedScreen email={user.email} />;
  }

  // 3. Fetch initial admin data with service role admin client
  const supabaseAdmin = getSupabaseAdmin();

  const [tenantsResult, transactionsResult] = await Promise.all([
    supabaseAdmin
      .from('business_demos')
      .select('id, name, slug, category, city, status, package_tier, custom_domain, site_active_until, domain_active_until, fomo_expires_at, created_at, updated_at, user_id, metadata, draft_metadata')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('transactions')
      .select('id, user_id, business_demo_id, amount, status, snapshot_tier, transaction_type, paid_at, payment_method, payment_gateway_ref, created_at')
      .order('created_at', { ascending: false }),
  ]);

  const tenants: TenantData[] = tenantsResult.data || [];
  const rawTransactions = transactionsResult.data || [];

  // 4. Calculate initial metrics
  const totalRevenue = rawTransactions
    .filter((t) => t.status === 'paid')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalPublished = tenants.filter((t) => t.status === 'published').length;
  const totalDemos = tenants.length;

  // Map business names to transactions
  const businessMap = new Map<string, { name: string; slug: string }>();
  tenants.forEach((t) => {
    businessMap.set(t.id, { name: t.name, slug: t.slug });
  });

  const enrichedTransactions: TransactionData[] = rawTransactions.map((tx) => ({
    ...tx,
    business_name: businessMap.get(tx.business_demo_id)?.name || 'N/A',
    business_slug: businessMap.get(tx.business_demo_id)?.slug || null,
  }));

  const initialStats: AdminStats = {
    totalRevenue,
    totalPublished,
    totalDemos,
    totalTransactions: rawTransactions.length,
  };

  return (
    <AdminConsoleClient
      initialStats={initialStats}
      initialTenants={tenants}
      initialTransactions={enrichedTransactions}
      adminEmail={user.email || 'Admin'}
    />
  );
}
