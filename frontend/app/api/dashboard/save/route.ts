import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { PackageTier, PACKAGE_LIMITS } from '@/lib/site-config';

export async function POST(request: Request) {
  try {
    const supabaseUser = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Harap login terlebih dahulu' },
        { status: 401 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const {
      id,
      name,
      phone,
      city,
      maps_url,
      metadata,
      draft_metadata,
      custom_domain,
      layout_id,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    // Verify user owns this business
    const { data: existingBiz, error: fetchError } = await supabaseAdmin
      .from('business_demos')
      .select('id, user_id, package_tier, metadata, draft_metadata')
      .eq('id', id)
      .single();

    if (fetchError || !existingBiz) {
      return NextResponse.json(
        { error: 'Bisnis tidak ditemukan' },
        { status: 404 }
      );
    }

    if (existingBiz.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Akses ditolak: Anda bukan pemilik bisnis ini' },
        { status: 403 }
      );
    }

    const activeTier = (existingBiz.package_tier as PackageTier) || 'instan';
    const tierLimits = PACKAGE_LIMITS[activeTier] || PACKAGE_LIMITS['instan'];

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updatePayload.name = name;
    if (phone !== undefined) updatePayload.phone = phone;
    if (city !== undefined) updatePayload.city = city;
    if (maps_url !== undefined) updatePayload.maps_url = maps_url;
    if (metadata !== undefined) {
      const sanitizedMarketing = tierLimits.promoFeatures
        ? metadata.marketing
        : { usps: metadata.marketing?.usps || [] };

      const sanitizedUiLabels = tierLimits.promoFeatures
        ? metadata.uiLabels
        : undefined;

      const sanitizedMenu = Array.isArray(metadata.menu)
        ? metadata.menu.slice(0, tierLimits.maxProducts)
        : metadata.menu;

      const sanitizedCategories = Array.isArray(metadata.categories)
        ? metadata.categories.slice(0, tierLimits.maxCategories)
        : metadata.categories;

      updatePayload.metadata = {
        ...metadata,
        menu: sanitizedMenu,
        categories: sanitizedCategories,
        marketing: sanitizedMarketing,
        uiLabels: sanitizedUiLabels,
      };
    }
    if (draft_metadata !== undefined) updatePayload.draft_metadata = draft_metadata;
    if (custom_domain !== undefined) {
      if (!tierLimits.customDomain) {
        updatePayload.custom_domain = null;
      } else {
        const cleanDomain = typeof custom_domain === 'string' ? custom_domain.trim().toLowerCase() : null;
        updatePayload.custom_domain = cleanDomain ? cleanDomain.replace(/^https?:\/\//, '').replace(/\/$/, '') : null;
      }
    }
    if (layout_id !== undefined) updatePayload.layout_id = layout_id;

    const { data, error } = await supabaseAdmin
      .from('business_demos')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Dashboard Save Error:', error);
      return NextResponse.json(
        { error: 'Gagal menyimpan perubahan ke database.', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
