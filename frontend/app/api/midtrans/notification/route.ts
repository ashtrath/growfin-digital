import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { sendInvoiceEmail, resolveRecipientEmail } from '@/lib/email';

export async function POST(request: Request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const body = await request.json();
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
      payment_type,
      transaction_id,
    } = body;

    if (!order_id || !status_code || !gross_amount || !signature_key) {
      return NextResponse.json(
        { error: 'Missing required notification fields' },
        { status: 400 }
      );
    }

    // 1. Verifikasi Keamanan Signature Key Resmi Midtrans
    // Rumus: SHA512(order_id + status_code + gross_amount + ServerKey)
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      console.error('[Midtrans Webhook] MIDTRANS_SERVER_KEY is not defined');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const payloadString = `${order_id}${status_code}${gross_amount}${serverKey}`;
    const calculatedSignature = crypto
      .createHash('sha512')
      .update(payloadString)
      .digest('hex');

    if (calculatedSignature !== signature_key) {
      console.warn('[Midtrans Webhook] Signature mismatch! Rejected.', {
        order_id,
        receivedSignature: signature_key,
        calculatedSignature,
      });
      return NextResponse.json(
        { error: 'Invalid signature key' },
        { status: 403 }
      );
    }

    // 2. Ambil Data Transaksi dari Database
    const { data: trxData, error: trxFetchError } = await supabaseAdmin
      .from('transactions')
      .select('id, status, user_id, business_demo_id, snapshot_tier, amount, transaction_type')
      .eq('id', order_id)
      .single();

    if (trxFetchError || !trxData) {
      console.error('[Midtrans Webhook] Transaction not found:', order_id, trxFetchError);
      return NextResponse.json(
        { error: 'Transaction not found in database' },
        { status: 404 }
      );
    }

    // 3. Idempotency Check: Jangan proses ulang jika transaksi sudah 'paid'
    if (trxData.status === 'paid') {
      console.log(`[Midtrans Webhook] Transaction ${order_id} is already 'paid'. Returning 200 OK.`);
      return NextResponse.json(
        { message: 'Transaction already paid and processed' },
        { status: 200 }
      );
    }

    // 4. Memetakan Status Transaksi Midtrans
    let isPaid = false;
    let isFailed = false;
    let failureStatus: 'failed' | 'expired' = 'failed';

    if (transaction_status === 'capture') {
      if (fraud_status === 'accept') {
        isPaid = true;
      } else if (fraud_status === 'challenge') {
        console.log(`[Midtrans Webhook] Transaction ${order_id} flagged as challenge.`);
      }
    } else if (transaction_status === 'settlement') {
      isPaid = true;
    } else if (transaction_status === 'cancel' || transaction_status === 'deny') {
      isFailed = true;
      failureStatus = 'failed';
    } else if (transaction_status === 'expire') {
      isFailed = true;
      failureStatus = 'expired';
    } else if (transaction_status === 'pending') {
      // Biarkan status 'pending', simpan metode pembayaran jika ada
      await supabaseAdmin
        .from('transactions')
        .update({
          payment_method: payment_type || null,
          payment_gateway_ref: transaction_id || null,
        })
        .eq('id', order_id);

      return NextResponse.json(
        { message: 'Notification received, transaction still pending' },
        { status: 200 }
      );
    }

    // 5. Eksekusi Perubahan Status 'paid'
    if (isPaid) {
      // A. Update tabel transactions
      const { error: trxUpdateError } = await supabaseAdmin
        .from('transactions')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_method: payment_type || null,
          payment_gateway_ref: transaction_id || null,
        })
        .eq('id', order_id);

      if (trxUpdateError) {
        console.error('[Midtrans Webhook] Failed to update transaction:', trxUpdateError);
        return NextResponse.json(
          { error: 'Failed to update transaction status' },
          { status: 500 }
        );
      }

      // B. Update tabel business_demos (Publikasikan & set masa aktif)
      if (trxData.business_demo_id) {
        const { data: businessData, error: bizFetchError } = await supabaseAdmin
          .from('business_demos')
          .select('id, slug, name, draft_metadata, metadata, package_tier, site_active_until, domain_active_until, status')
          .eq('id', trxData.business_demo_id)
          .single();

        if (bizFetchError) {
          console.error('[Midtrans Webhook] Failed to fetch business demo:', bizFetchError);
        } else if (businessData) {
          const txType = trxData.transaction_type || 'activation';
          const tier = trxData.snapshot_tier || businessData.package_tier || 'instan';
          const now = new Date();
          const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

          let siteActiveUntil: string | null = null;
          let domainActiveUntil: string | null = null;

          // Untuk semua paket berbayar (instan, pro-basic, pro-advanced):
          // 1. Logika site_active_until:
          if (
            txType === 'renewal' &&
            businessData.site_active_until &&
            new Date(businessData.site_active_until) > now
          ) {
            // Jika renewal dan site_active_until masih di masa depan (belum expired),
            // tambahkan +365 hari dari tanggal yang ada agar sisa hari tidak hangus
            const currentExpiry = new Date(businessData.site_active_until);
            siteActiveUntil = new Date(currentExpiry.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
          } else {
            // Jika upgrade, activation, atau jika website sudah terlanjur expired
            siteActiveUntil = oneYearFromNow;
          }

          // 2. Logika domain_active_until (khusus untuk pro-basic ke atas):
          if (tier === 'pro-basic' || tier === 'pro-advanced' || tier === 'enterprise') {
            if (
              txType === 'renewal' &&
              businessData.domain_active_until &&
              new Date(businessData.domain_active_until) > now
            ) {
              const currentDomainExpiry = new Date(businessData.domain_active_until);
              domainActiveUntil = new Date(currentDomainExpiry.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
            } else {
              domainActiveUntil = oneYearFromNow;
            }
          } else {
            domainActiveUntil = null;
          }

          const { error: bizUpdateError } = await supabaseAdmin
            .from('business_demos')
            .update({
              scraping_status: 'published',
              status: 'published',
              user_id: trxData.user_id,
              metadata: businessData.draft_metadata || businessData.metadata || undefined,
              package_tier: tier,
              site_active_until: siteActiveUntil,
              domain_active_until: domainActiveUntil,
            })
            .eq('id', trxData.business_demo_id);

          if (bizUpdateError) {
            console.error('[Midtrans Webhook] Failed to publish business demo:', bizUpdateError);
          } else {
            console.log(`[Midtrans Webhook] Business demo ${businessData.slug} successfully published (Tier: ${tier}).`);

            // C. Kirim Email Invoice Resmi via Resend (Non-blocking)
            try {
              const recipientEmail = await resolveRecipientEmail(
                supabaseAdmin,
                trxData.user_id,
                businessData.metadata,
                businessData.draft_metadata
              );

              if (recipientEmail) {
                await sendInvoiceEmail({
                  toEmail: recipientEmail,
                  businessName: businessData.name || (businessData.metadata as any)?.name || 'Bisnis Anda',
                  orderId: order_id,
                  paidAt: new Date().toISOString(),
                  amount: Math.round(Number(gross_amount)) || trxData.amount || 0,
                  packageTier: tier,
                  paymentMethod: payment_type || 'Online Payment',
                  slug: businessData.slug,
                });
              }
            } catch (emailErr) {
              console.error('[Midtrans Webhook] Non-blocking invoice email dispatch error:', emailErr);
            }

            // D. On-Demand Revalidation: Segarkan cache situs publik secara instan
            try {
              revalidatePath(`/${businessData.slug}`);
              revalidatePath(`/site/${businessData.slug}`);
            } catch (revalidateErr) {
              console.warn('[Midtrans Webhook] Revalidation error:', revalidateErr);
            }
          }
        }
      }

      return NextResponse.json(
        { message: 'Payment successfully verified and business published' },
        { status: 200 }
      );
    }

    // 6. Eksekusi Perubahan Status Gagal / Expired
    if (isFailed) {
      await supabaseAdmin
        .from('transactions')
        .update({
          status: failureStatus,
          payment_method: payment_type || null,
          payment_gateway_ref: transaction_id || null,
        })
        .eq('id', order_id);

      return NextResponse.json(
        { message: `Transaction marked as ${failureStatus}` },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: 'Notification processed' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[Midtrans Webhook Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
