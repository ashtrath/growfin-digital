import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient as createServerSupabase } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { isAdminEmail } from '@/lib/admin';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Supabase environment variables are missing');
  }

  return createAdminClient(supabaseUrl, serviceKey);
}

/**
 * GET /api/admin/tenant
 * Returns summary metrics, list of business_demos, and list of transactions.
 * Protected by Supabase Auth & ADMIN_EMAILS verification.
 */
export async function GET() {
  try {
    const supabaseUser = await createServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (authError || !user || !isAdminEmail(user.email)) {
      return NextResponse.json(
        { error: 'Unauthorized: Akses ditolak. Hanya email Super Admin yang diizinkan.' },
        { status: 403 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Fetch all business_demos
    const { data: tenants, error: tenantsError } = await supabaseAdmin
      .from('business_demos')
      .select('id, name, slug, category, city, status, package_tier, custom_domain, site_active_until, domain_active_until, created_at, updated_at, user_id, metadata, draft_metadata')
      .order('created_at', { ascending: false });

    if (tenantsError) {
      console.error('[Admin API] Error fetching tenants:', tenantsError);
      return NextResponse.json({ error: tenantsError.message }, { status: 500 });
    }

    // 2. Fetch all transactions
    const { data: transactions, error: trxError } = await supabaseAdmin
      .from('transactions')
      .select('id, user_id, business_demo_id, amount, status, snapshot_tier, transaction_type, paid_at, payment_method, payment_gateway_ref, created_at')
      .order('created_at', { ascending: false });

    if (trxError) {
      console.error('[Admin API] Error fetching transactions:', trxError);
      return NextResponse.json({ error: trxError.message }, { status: 500 });
    }

    // 3. Compute Metrics
    const tenantList = tenants || [];
    const transactionList = transactions || [];

    const totalRevenue = transactionList
      .filter((t) => t.status === 'paid')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const totalPublished = tenantList.filter((t) => t.status === 'published').length;
    const totalDemos = tenantList.length;

    // Map business name and slug to transactions
    const businessMap = new Map<string, { name: string; slug: string }>();
    tenantList.forEach((t) => {
      businessMap.set(t.id, { name: t.name, slug: t.slug });
    });

    const enrichedTransactions = transactionList.map((tx) => ({
      ...tx,
      business_name: businessMap.get(tx.business_demo_id)?.name || 'N/A',
      business_slug: businessMap.get(tx.business_demo_id)?.slug || null,
    }));

    return NextResponse.json({
      stats: {
        totalRevenue,
        totalPublished,
        totalDemos,
        totalTransactions: transactionList.length,
      },
      tenants: tenantList,
      transactions: enrichedTransactions,
      adminEmail: user.email,
    });
  } catch (error: any) {
    console.error('[Admin API GET Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/tenant
 * Updates status, package_tier, and/or custom_domain of a specific tenant.
 * Protected by Supabase Auth & ADMIN_EMAILS verification.
 */
export async function PATCH(request: Request) {
  try {
    const supabaseUser = await createServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (authError || !user || !isAdminEmail(user.email)) {
      return NextResponse.json(
        { error: 'Unauthorized: Akses ditolak. Hanya email Super Admin yang diizinkan.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      id,
      status,
      package_tier,
      custom_domain,
      name,
      category,
      city,
      site_active_until,
      domain_active_until,
      fomo_expires_at,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Tenant ID wajib diisi.' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updatePayload.name = name;
    if (category !== undefined) updatePayload.category = category;
    if (city !== undefined) updatePayload.city = city;
    if (site_active_until !== undefined) updatePayload.site_active_until = site_active_until || null;
    if (domain_active_until !== undefined) updatePayload.domain_active_until = domain_active_until || null;
    if (fomo_expires_at !== undefined) updatePayload.fomo_expires_at = fomo_expires_at || null;

    if (status !== undefined) {
      if (!['draft', 'published', 'locked'].includes(status)) {
        return NextResponse.json(
          { error: 'Status tidak valid. Harus: draft, published, atau locked.' },
          { status: 400 }
        );
      }
      updatePayload.status = status;
      if (status === 'published') {
        updatePayload.scraping_status = 'published';
      }
    }

    if (package_tier !== undefined) {
      updatePayload.package_tier = package_tier;
    }

    if (custom_domain !== undefined) {
      const cleanDomain = custom_domain
        ? custom_domain
            .trim()
            .toLowerCase()
            .replace(/^https?:\/\//, '')
            .replace(/\/+$/, '')
        : null;
      updatePayload.custom_domain = cleanDomain;

      // Jika Super Admin mengisi kolom custom_domain, otomatis ubah metadata.domainRequest.status = 'active'
      if (cleanDomain) {
        const supabaseAdmin = getSupabaseAdmin();
        const { data: currentBiz } = await supabaseAdmin
          .from('business_demos')
          .select('metadata, draft_metadata')
          .eq('id', id)
          .single();

        if (currentBiz) {
          const currentMeta = currentBiz.metadata || {};
          const currentDraft = currentBiz.draft_metadata || {};

          if (currentMeta.domainRequest) {
            updatePayload.metadata = {
              ...currentMeta,
              domainRequest: {
                ...currentMeta.domainRequest,
                status: 'active',
                activatedAt: new Date().toISOString(),
              },
            };
          }
          if (currentDraft.domainRequest) {
            updatePayload.draft_metadata = {
              ...currentDraft,
              domainRequest: {
                ...currentDraft.domainRequest,
                status: 'active',
                activatedAt: new Date().toISOString(),
              },
            };
          }
        }
      }
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: updatedTenant, error: updateError } = await supabaseAdmin
      .from('business_demos')
      .update(updatePayload)
      .eq('id', id)
      .select('id, name, slug, category, city, status, package_tier, custom_domain, site_active_until, domain_active_until, fomo_expires_at, created_at, updated_at, user_id, metadata, draft_metadata')
      .single();

    if (updateError) {
      console.error('[Admin API PATCH Error]:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // On-Demand Revalidation: Segarkan cache situs publik secara instan
    if (updatedTenant?.slug) {
      try {
        revalidatePath(`/${updatedTenant.slug}`);
        revalidatePath(`/site/${updatedTenant.slug}`);
      } catch (revalidateErr) {
        console.warn('[Admin API] Revalidation error:', revalidateErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Data tenant berhasil diperbarui.',
      tenant: updatedTenant,
    });
  } catch (error: any) {
    console.error('[Admin API PATCH Exception]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
