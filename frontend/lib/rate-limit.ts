import { createClient } from '@supabase/supabase-js';

// Konfigurasi Batas Pembuatan Website
export const RATE_LIMIT_CONFIG = {
  // Batas per perangkat/browser (Device ID / Cookie) dalam 24 jam
  MAX_PER_DEVICE_24H: 3,
  // Batas per IP publik (melindungi shared Wi-Fi / kantor dari pemblokiran dini)
  MAX_PER_IP_24H: 20,
  // Perlindungan burst singkat (maks 3 request per 15 detik dari IP yang sama)
  BURST_WINDOW_MS: 15 * 1000,
  BURST_MAX_REQUESTS: 3,
};

// In-Memory Burst Cache (sliding window untuk menangkal spam otomatis cepat)
interface BurstRecord {
  count: number;
  resetAt: number;
}
const burstCache = new Map<string, BurstRecord>();

/**
 * Ekstraksi IP Address asli klien dari request Next.js (mendukung Vercel & Cloudflare)
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim();
    if (firstIp) return firstIp;
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  return '127.0.0.1';
}

/**
 * Ekstraksi atau Inisialisasi Device Token dari Cookie / Header / Body
 */
export function extractDeviceId(request: Request, bodyDeviceId?: string): string {
  // 1. Coba dari Cookie
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/growfin_device_id=([^;]+)/);
  if (match && match[1]) {
    return decodeURIComponent(match[1].trim());
  }

  // 2. Coba dari Header x-device-id
  const headerDeviceId = request.headers.get('x-device-id');
  if (headerDeviceId && headerDeviceId.trim()) {
    return headerDeviceId.trim();
  }

  // 3. Coba dari request body
  if (bodyDeviceId && bodyDeviceId.trim()) {
    return bodyDeviceId.trim();
  }

  // 4. Buat token baru jika belum ada
  return `dev_${Math.random().toString(36).substring(2, 12)}_${Date.now().toString(36)}`;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  reason?: 'burst' | 'device_limit' | 'ip_limit';
  message?: string;
  deviceCount: number;
  ipCount: number;
}

/**
 * Pengecekan Hybrid Rate Limit:
 * 1. Cek Burst Throttle in-memory
 * 2. Cek kuota 24 jam di Supabase (Device Token max 3 & IP max 20)
 */
export async function checkRateLimit(
  request: Request,
  deviceId: string
): Promise<RateLimitCheckResult> {
  const clientIp = getClientIp(request);
  const now = Date.now();

  // 1. Burst Throttle (Mencegah loop script spamming dalam hitungan detik)
  const burstKey = `${clientIp}_${deviceId}`;
  const burstData = burstCache.get(burstKey);
  if (burstData && burstData.resetAt > now) {
    if (burstData.count >= RATE_LIMIT_CONFIG.BURST_MAX_REQUESTS) {
      return {
        allowed: false,
        reason: 'burst',
        message: 'Aktivitas terlalu cepat. Harap tunggu beberapa saat sebelum mencoba kembali.',
        deviceCount: burstData.count,
        ipCount: burstData.count,
      };
    }
    burstData.count += 1;
  } else {
    burstCache.set(burstKey, {
      count: 1,
      resetAt: now + RATE_LIMIT_CONFIG.BURST_WINDOW_MS,
    });
  }

  // Bersihkan cache in-memory yang sudah kedaluwarsa secara berkala
  if (burstCache.size > 1000) {
    for (const [key, val] of burstCache.entries()) {
      if (val.resetAt <= now) burstCache.delete(key);
    }
  }

  // 2. Cek Kuota 24 Jam di Database Supabase
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

    const { data: recentDemos, error } = await supabaseAdmin
      .from('business_demos')
      .select('id, metadata')
      .gte('created_at', twentyFourHoursAgo);

    if (error) {
      console.warn('[RateLimit] Gagal mengambil data demo 24h:', error.message);
      // Fail-open jika database sementara bermasalah agar tidak memblokir user sah
      return { allowed: true, deviceCount: 0, ipCount: 0 };
    }

    let deviceCount = 0;
    let ipCount = 0;

    if (recentDemos && recentDemos.length > 0) {
      for (const demo of recentDemos) {
        const meta = demo.metadata;
        if (!meta) continue;
        if (meta.deviceId === deviceId) {
          deviceCount++;
        }
        if (meta.clientIp === clientIp) {
          ipCount++;
        }
      }
    }

    // A. Batas Perangkat (Browser / Device)
    if (deviceCount >= RATE_LIMIT_CONFIG.MAX_PER_DEVICE_24H) {
      return {
        allowed: false,
        reason: 'device_limit',
        message: 'Batas harian tercapai. Perangkat Anda telah mencapai kuota maksimal (3 website per 24 jam). Silakan coba lagi besok.',
        deviceCount,
        ipCount,
      };
    }

    // B. Batas Jaringan Bersama (IP Kantor / Wi-Fi Publik)
    if (ipCount >= RATE_LIMIT_CONFIG.MAX_PER_IP_24H) {
      return {
        allowed: false,
        reason: 'ip_limit',
        message: 'Batas pembuatan website untuk jaringan internet ini telah tercapai (maksimal 20 per 24 jam). Silakan coba lagi nanti atau gunakan koneksi data seluler.',
        deviceCount,
        ipCount,
      };
    }

    return {
      allowed: true,
      deviceCount,
      ipCount,
    };
  } catch (err: any) {
    console.error('[RateLimit Exception]:', err);
    // Fail-open pada pengecualian tidak terduga
    return { allowed: true, deviceCount: 0, ipCount: 0 };
  }
}
