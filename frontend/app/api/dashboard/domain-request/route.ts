import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { PACKAGE_LIMITS, PackageTier } from '@/lib/site-config';
import { sendDomainRequestAdminEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const supabaseUser = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Harap login terlebih dahulu.' },
        { status: 401 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const {
      business_id,
      requested_domain,
      alternative_domain,
      whatsapp_contact,
    } = body;

    if (!business_id || !requested_domain) {
      return NextResponse.json(
        { error: 'ID Bisnis dan Nama Domain Pilihan wajib diisi.' },
        { status: 400 }
      );
    }

    // 1. Fetch business and verify ownership
    const { data: business, error: bizError } = await supabaseAdmin
      .from('business_demos')
      .select('id, name, slug, user_id, package_tier, metadata, draft_metadata, custom_domain')
      .eq('id', business_id)
      .single();

    if (bizError || !business) {
      return NextResponse.json(
        { error: 'Website bisnis tidak ditemukan.' },
        { status: 404 }
      );
    }

    if (business.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Akses ditolak: Anda bukan pemilik website bisnis ini.' },
        { status: 403 }
      );
    }

    // 2. Verifikasi Batas Paket (Feature Gating)
    const tier: PackageTier = (business.package_tier as PackageTier) || 'free_trial';
    const limits = PACKAGE_LIMITS[tier] || PACKAGE_LIMITS['free_trial'];

    if (!limits.customDomain) {
      return NextResponse.json(
        { error: `Paket ${tier.toUpperCase()} tidak mendukung fitur domain kustom. Silakan upgrade ke paket Pro Basic atau Pro Advanced.` },
        { status: 403 }
      );
    }

    // 3. Sanitasi Format Domain
    const cleanDomain = requested_domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '')
      .replace(/\s+/g, '');

    const cleanAltDomain = alternative_domain
      ? alternative_domain
          .trim()
          .toLowerCase()
          .replace(/^https?:\/\//, '')
          .replace(/\/+$/, '')
          .replace(/\s+/g, '')
      : undefined;

    // 4. Susun Objek domainRequest
    const domainRequest = {
      requestedDomain: cleanDomain,
      alternativeDomain: cleanAltDomain || undefined,
      whatsappContact: whatsapp_contact ? String(whatsapp_contact).trim() : undefined,
      status: 'pending' as const,
      requestedAt: new Date().toISOString(),
    };

    const updatedMetadata = {
      ...(business.metadata || {}),
      domainRequest,
    };

    const updatedDraftMetadata = {
      ...(business.draft_metadata || {}),
      domainRequest,
    };

    // 5. Simpan ke database
    const { error: updateError } = await supabaseAdmin
      .from('business_demos')
      .update({
        metadata: updatedMetadata,
        draft_metadata: updatedDraftMetadata,
      })
      .eq('id', business.id);

    if (updateError) {
      console.error('[Domain Request API Error]:', updateError);
      return NextResponse.json(
        { error: 'Gagal menyimpan permohonan domain ke database.' },
        { status: 500 }
      );
    }

    // 6. Kirim Notifikasi Email ke Super Admin (Non-blocking)
    try {
      await sendDomainRequestAdminEmail({
        businessName: business.name,
        slug: business.slug,
        requestedDomain: cleanDomain,
        alternativeDomain: cleanAltDomain,
        whatsappContact: domainRequest.whatsappContact,
        userEmail: user.email,
      });
    } catch (emailErr) {
      console.error('[Domain Request Notification Email Error]:', emailErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Permintaan domain kustom berhasil diajukan dan sedang diproses tim admin.',
      domainRequest,
    });
  } catch (error: any) {
    console.error('[Domain Request API Exception]:', error);
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan sistem' },
      { status: 500 }
    );
  }
}
