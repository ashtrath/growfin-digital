import { Resend } from 'resend';
import { SupabaseClient } from '@supabase/supabase-js';
import { siteConfig } from '@/lib/site-config';
import { getAdminEmails } from '@/lib/admin';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface InvoiceEmailParams {
  toEmail: string;
  businessName: string;
  orderId: string;
  paidAt?: string;
  amount: number;
  packageTier?: string;
  paymentMethod?: string | null;
  slug: string;
}

/**
 * Format currency ke Rupiah (IDR)
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format nama paket agar ramah dibaca pengguna
 */
function formatTierTitle(tier?: string): string {
  switch (tier) {
    case 'instan':
      return 'Paket Template Instan (Website Lifetime)';
    case 'pro-basic':
      return 'Paket Pro Basic (Website Lifetime + Domain 1 Thn)';
    case 'pro-advanced':
      return 'Paket Pro Advanced (Full System 1 Thn)';
    case 'enterprise':
      return 'Paket Enterprise Custom';
    default:
      return tier || 'Aktivasi Website';
  }
}

/**
 * Format tanggal dalam format Bahasa Indonesia (WIB)
 */
function formatDate(dateStr?: string): string {
  const date = dateStr ? new Date(dateStr) : new Date();
  return (
    date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    }) + ' WIB'
  );
}

/**
 * Helper untuk mengambil email user tujuan dari Supabase Auth atau metadata demo
 */
export async function resolveRecipientEmail(
  supabaseAdmin: SupabaseClient,
  userId?: string | null,
  metadata?: any,
  draftMetadata?: any
): Promise<string | null> {
  // 1. Cek dari auth.users via Supabase Admin SDK
  if (userId) {
    try {
      const { data: authUser, error } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (!error && authUser?.user?.email) {
        return authUser.user.email;
      }
    } catch (err) {
      console.warn('[Email Helper] Failed to fetch email from auth.users:', err);
    }
  }

  // 2. Cek dari field metadata / draft_metadata
  const metaEmail =
    metadata?.userEmail ||
    metadata?.email ||
    draftMetadata?.userEmail ||
    draftMetadata?.email;

  if (metaEmail && typeof metaEmail === 'string' && metaEmail.includes('@')) {
    return metaEmail;
  }

  return null;
}

/**
 * Mengirim email invoice kuitansi resmi lunas via Resend
 * Selalu non-blocking dan aman dari crash runtime.
 */
export async function sendInvoiceEmail(params: InvoiceEmailParams): Promise<{ success: boolean; error?: any }> {
  const {
    toEmail,
    businessName,
    orderId,
    paidAt,
    amount,
    packageTier,
    paymentMethod,
    slug,
  } = params;

  if (!toEmail) {
    console.warn('[Invoice Email] No recipient email specified. Skipping email dispatch.');
    return { success: false, error: 'No recipient email' };
  }

  const publicUrl = `https://growfin.my.id/${slug}`;
  const formattedAmount = formatCurrency(amount);
  const formattedDate = formatDate(paidAt);
  const tierName = formatTierTitle(packageTier);
  const waNumber = siteConfig.contact.whatsappNumber;
  const waLink = `https://wa.me/${waNumber}`;
  const contactEmail = siteConfig.contact.email;

  try {
    const { data, error } = await resend.emails.send({
      from: 'Growfin Billing <hello@growfin.my.id>',
      to: toEmail,
      subject: `Kuitansi Pembayaran Website ${businessName} - #${orderId.slice(0, 8)}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Kuitansi Pembayaran Growfin Digital</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px 12px; color: #1e293b;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0 0 6px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Growfin Digital</h1>
              <p style="color: #94a3b8; margin: 0; font-size: 14px;">Bukti Pembayaran & Kuitansi Resmi</p>
            </div>

            <!-- Content Area -->
            <div style="padding: 28px 24px;">
              <!-- Status Badge -->
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="background-color: #dcfce7; color: #15803d; padding: 6px 16px; border-radius: 9999px; font-size: 13px; font-weight: 700; display: inline-block;">
                  ✓ PEMBAYARAN LUNAS
                </span>
                <h2 style="margin: 16px 0 6px 0; font-size: 20px; color: #0f172a;">Terima Kasih atas Pembayaran Anda!</h2>
                <p style="margin: 0; color: #64748b; font-size: 14px;">Website bisnis untuk <strong>${businessName}</strong> kini telah aktif dan siap diakses secara publik.</p>
              </div>

              <!-- Receipt Summary Card -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">No. Transaksi / Order ID</td>
                    <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0f172a; font-family: monospace;">${orderId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Tanggal Lunas</td>
                    <td style="padding: 8px 0; font-weight: 500; text-align: right; color: #0f172a;">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Paket Layanan</td>
                    <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0f172a;">${tierName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Metode Pembayaran</td>
                    <td style="padding: 8px 0; font-weight: 500; text-align: right; color: #0f172a; text-transform: uppercase;">${paymentMethod || 'Online Payment'}</td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding-top: 12px; border-top: 1px dashed #cbd5e1;"></td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 16px; font-weight: 700; color: #0f172a;">Total Pembayaran</td>
                    <td style="padding: 8px 0; font-size: 18px; font-weight: 800; text-align: right; color: #00b894;">${formattedAmount}</td>
                  </tr>
                </table>
              </div>

              <!-- Live Website Access Card -->
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px; margin-bottom: 24px; text-align: center;">
                <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">URL Website Publik Anda</p>
                <p style="margin: 0; font-size: 16px; font-weight: 700;">
                  <a href="${publicUrl}" style="color: #00b894; text-decoration: underline;" target="_blank">${publicUrl}</a>
                </p>
              </div>

              <!-- Action CTA Button -->
              <div style="text-align: center; margin: 28px 0 16px 0;">
                <a href="https://growfin.my.id/dashboard" style="background-color: #00b894; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: 700; font-size: 15px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 12px rgba(0, 184, 148, 0.25);">
                  Buka Dashboard Pengelola
                </a>
              </div>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 20px 0;">

              <!-- Footer -->
              <div style="font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.6;">
                <p style="margin: 0 0 6px 0;">Email ini merupakan bukti pembayaran resmi yang sah dari Growfin Digital.</p>
                <p style="margin: 0 0 10px 0; color: #64748b;">
                  Jika Anda memiliki pertanyaan seputar website Anda, silakan hubungi kami via WhatsApp: 
                  <a href="${waLink}" style="color: #00b894; font-weight: 600; text-decoration: underline;" target="_blank">+${waNumber}</a> 
                  atau email: 
                  <a href="mailto:${contactEmail}" style="color: #00b894; font-weight: 600; text-decoration: underline;">${contactEmail}</a>
                </p>
                <p style="margin: 0; font-weight: 600; color: #94a3b8;">&copy; ${new Date().getFullYear()} Growfin Digital. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('[Invoice Email] Resend API error:', error);
      return { success: false, error: error.message || String(error) };
    }

    console.log('[Invoice Email] Successfully dispatched email via Resend:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('[Invoice Email] Failed to send email via Resend:', error);
    return { success: false, error: error?.message || String(error) };
  }
}

export interface FomoReminderEmailParams {
  toEmail: string;
  businessName: string;
  slug: string;
  expiresAt: string;
}

/**
 * Mengirim email pengingat FOMO sebelum link demo terkunci (locked) via Resend
 */
export async function sendFomoReminderEmail(
  params: FomoReminderEmailParams
): Promise<{ success: boolean; error?: any }> {
  const { toEmail, businessName, slug, expiresAt } = params;

  if (!toEmail) {
    return { success: false, error: 'No recipient email' };
  }

  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  const remainingHours = Math.max(1, Math.round(remainingMs / (1000 * 60 * 60)));
  const demoUrl = `https://growfin.my.id/${slug}`;
  const formattedExpiry = formatDate(expiresAt);
  const waNumber = siteConfig.contact.whatsappNumber;
  const waLink = `https://wa.me/${waNumber}`;
  const contactEmail = siteConfig.contact.email;

  try {
    const { data, error } = await resend.emails.send({
      from: 'Growfin Reminder <hello@growfin.my.id>',
      to: toEmail,
      subject: `⚠️ Sisa ${remainingHours} Jam: Website ${businessName} Akan Segera Terkunci!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Peringatan Masa Trial Website</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px 12px; color: #1e293b;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #fed7aa; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <!-- Urgency Header -->
            <div style="background: linear-gradient(135deg, #c2410c 0%, #ea580c 100%); padding: 32px 24px; text-align: center;">
              <span style="background-color: rgba(255, 255, 255, 0.2); color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; display: inline-block; margin-bottom: 10px; letter-spacing: 0.5px;">
                ⏰ PERINGATAN KEDALUWARSA
              </span>
              <h1 style="color: #ffffff; margin: 0 0 6px 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
                Website Bisnis Anda Akan Terkunci
              </h1>
              <p style="color: #ffedd5; margin: 0; font-size: 14px;">Batas waktu aktivasi penawaran promo segera berakhir</p>
            </div>

            <!-- Content Area -->
            <div style="padding: 28px 24px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #0f172a; line-height: 1.5;">
                Halo Pemilik <strong>${businessName}</strong>,
              </p>
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                Desain website profesional yang telah diracik otomatis oleh sistem AI Growfin untuk bisnis Anda akan segera memasuki status <strong>Terkunci (Locked)</strong> pada:
              </p>

              <!-- Expiry Countdown Box -->
              <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 18px; margin-bottom: 24px; text-align: center;">
                <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 700; color: #c2410c; text-transform: uppercase;">Waktu Kedaluwarsa Penawaran</p>
                <p style="margin: 0 0 6px 0; font-size: 18px; font-weight: 800; color: #9a3412;">
                  ${formattedExpiry}
                </p>
                <p style="margin: 0; font-size: 13px; font-weight: 600; color: #ea580c;">
                  Tersisa sekitar ±${remainingHours} jam lagi sebelum link demo terkunci otomatis.
                </p>
              </div>

              <!-- What happens if locked -->
              <div style="margin-bottom: 28px;">
                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 700; color: #0f172a;">Apa yang terjadi jika website terkunci?</p>
                <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.7;">
                  <li>Halaman preview interaktif tidak lagi dapat diakses publik.</li>
                  <li>Kupon diskon paket aktivasi khusus UMKM akan hangus.</li>
                  <li>Katalog menu, ulasan Google, dan kustomisasi AI akan diarsipkan.</li>
                </ul>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 24px 0 20px 0;">
                <a href="${demoUrl}" style="background-color: #00b894; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: 700; font-size: 15px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 12px rgba(0, 184, 148, 0.25);">
                  Klaim & Publikasikan Website Sekarang
                </a>
              </div>
              <p style="text-align: center; margin: 0 0 24px 0; font-size: 12px; color: #64748b;">
                Atau salin tautan berikut: <br>
                <a href="${demoUrl}" style="color: #00b894; text-decoration: underline;" target="_blank">${demoUrl}</a>
              </p>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 20px 0;">

              <!-- Footer -->
              <div style="font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.6;">
                <p style="margin: 0 0 6px 0;">Email ini dikirim secara otomatis sebagai pengingat batas waktu uji coba sistem Growfin Digital.</p>
                <p style="margin: 0 0 10px 0; color: #64748b;">
                  Butuh bantuan konsultasi? Hubungi tim support kami via WhatsApp: 
                  <a href="${waLink}" style="color: #00b894; font-weight: 600; text-decoration: underline;" target="_blank">+${waNumber}</a> 
                  atau email: 
                  <a href="mailto:${contactEmail}" style="color: #00b894; font-weight: 600; text-decoration: underline;">${contactEmail}</a>
                </p>
                <p style="margin: 0; font-weight: 600; color: #94a3b8;">&copy; ${new Date().getFullYear()} Growfin Digital. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('[FOMO Reminder Email] Resend API error:', error);
      return { success: false, error: error.message || String(error) };
    }

    console.log('[FOMO Reminder Email] Dispatched email via Resend:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('[FOMO Reminder Email] Failed to send email via Resend:', error);
    return { success: false, error: error?.message || String(error) };
  }
}

export interface DomainRequestEmailParams {
  businessName: string;
  slug: string;
  requestedDomain: string;
  alternativeDomain?: string;
  whatsappContact?: string;
  userEmail?: string;
}

/**
 * Mengirim notifikasi permintaan setup domain baru ke Super Admin via Resend
 */
export async function sendDomainRequestAdminEmail(
  params: DomainRequestEmailParams
): Promise<{ success: boolean; error?: any }> {
  const { businessName, slug, requestedDomain, alternativeDomain, whatsappContact, userEmail } = params;
  const adminEmails = getAdminEmails();

  if (!adminEmails || adminEmails.length === 0) {
    console.warn('[Domain Request Email] No ADMIN_EMAILS configured in environment.');
    return { success: false, error: 'No admin emails configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Growfin System <hello@growfin.my.id>',
      to: adminEmails,
      subject: `🌐 Permintaan Setup Domain Baru: ${requestedDomain} dari ${businessName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Permintaan Setup Domain Baru</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0B0B0E; color: #fff; padding: 24px;">
          <div style="max-width: 560px; margin: 0 auto; background: #14141A; border: 1px solid #262633; border-radius: 16px; padding: 24px;">
            <h2 style="color: #00b894; margin-top: 0;">🌐 Permintaan Setup Domain Baru</h2>
            <p style="color: #8E8EA0;">Klien telah mengajukan permohonan domain kustom terima beres:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; color: #8E8EA0;">Nama Bisnis:</td>
                <td style="padding: 8px 0; color: #fff; font-weight: bold;">${businessName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #8E8EA0;">Slug Website:</td>
                <td style="padding: 8px 0; color: #fff; font-family: monospace;">${slug}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #8E8EA0;">Domain Pilihan 1:</td>
                <td style="padding: 8px 0; color: #00b894; font-weight: bold; font-family: monospace;">${requestedDomain}</td>
              </tr>
              ${alternativeDomain ? `
              <tr>
                <td style="padding: 8px 0; color: #8E8EA0;">Domain Cadangan:</td>
                <td style="padding: 8px 0; color: #fff; font-family: monospace;">${alternativeDomain}</td>
              </tr>` : ''}
              ${whatsappContact ? `
              <tr>
                <td style="padding: 8px 0; color: #8E8EA0;">Kontak WhatsApp:</td>
                <td style="padding: 8px 0; color: #fff;"><a href="https://wa.me/${whatsappContact.replace(/\D/g, '')}" style="color: #00b894;">${whatsappContact}</a></td>
              </tr>` : ''}
              ${userEmail ? `
              <tr>
                <td style="padding: 8px 0; color: #8E8EA0;">Email Klien:</td>
                <td style="padding: 8px 0; color: #fff;">${userEmail}</td>
              </tr>` : ''}
            </table>
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #262633;">
              <p style="font-size: 13px; color: #8E8EA0; margin: 0 0 12px 0;">Beli domain dan arahkan CNAME ke Vercel (<code>cname.vercel-dns.com</code>), lalu aktifkan di Konsol Super Admin:</p>
              <a href="https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'growfin.my.id'}/back-stage" style="display: inline-block; background: #00b894; color: #000; font-weight: bold; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 13px;">Buka Super Admin Console</a>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('[Domain Request Email] Resend API error:', error);
      return { success: false, error: error.message || String(error) };
    }

    console.log('[Domain Request Email] Dispatched email to admins:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('[Domain Request Email] Failed to send email via Resend:', error);
    return { success: false, error: error?.message || String(error) };
  }
}


