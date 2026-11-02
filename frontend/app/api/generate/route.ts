import { NextResponse, after } from 'next/server';
import { supabase } from '@/lib/supabase';
import { resolveTemplateType } from '@/lib/template-resolver';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Resend } from 'resend';
import { checkRateLimit, extractDeviceId, getClientIp } from '@/lib/rate-limit';

// 1. Inisialisasi Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const resend = new Resend(process.env.RESEND_API_KEY);

// Generate a URL-friendly slug from the business name
function generateSlug(name: string): string {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  const uniqueId = Math.random().toString(36).substring(2, 6);
  return `${baseSlug}-${uniqueId}`;
}

// Normalize phone number to consistent 628... format
function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    digits = '62' + digits.substring(1);
  }
  return digits;
}

// Map Google Places primaryType ke Kategori kita secara pintar
function mapPrimaryTypeToCategory(primaryType: string, userCategory: string): string {
  const type = primaryType.toLowerCase();

  const fnbTypes = ['restaurant', 'cafe', 'coffee_shop', 'bakery', 'fast_food_restaurant', 'meal_takeaway', 'ice_cream_shop'];
  const groomingTypes = ['beauty_salon', 'barber_shop', 'spa', 'hair_care', 'massage_spa', 'nail_salon'];
  const retailTypes = ['pet_store', 'florist', 'clothing_store', 'electronics_store', 'supermarket', 'convenience_store', 'hardware_store', 'store'];
  const serviceTypes = ['medical_clinic', 'dentist', 'doctor', 'hospital', 'veterinary_care', 'pharmacy', 'laundry', 'car_repair', 'travel_agency', 'real_estate_agency'];

  const fnbCategories = ['Restaurant', 'Cafe & Coffee Shop', 'Bakery & Dessert Shop', 'Fast Food Restaurant', 'Bubble Tea Shop / Juice Shop'];
  const groomingCategories = ['Beauty Salon', 'Hair Salon & Barbershop', 'Nail Salon', 'Day Spa & Massage Spa', 'Skin Care Clinic', 'Make-up Artist'];
  const retailCategories = ['Supermarket & Grocery Store', 'Convenience Store', 'Clothing Store & Boutique', 'Electronics Store', 'Shoe Store', 'Pet Store', 'Hardware Store'];
  const serviceCategories = ['Laundry Service & Dry Cleaner', 'Car Repair & Maintenance', 'Cleaning Service', 'Tailor (Penjahit)', 'Travel Agency', 'Real Estate Agency'];

  if (fnbTypes.includes(type)) {
    return fnbCategories.includes(userCategory) ? userCategory : 'Restaurant';
  }
  if (groomingTypes.includes(type)) {
    return groomingCategories.includes(userCategory) ? userCategory : 'Beauty Salon';
  }
  if (retailTypes.includes(type)) {
    return retailCategories.includes(userCategory) ? userCategory : 'Supermarket & Grocery Store';
  }
  if (serviceTypes.includes(type)) {
    return serviceCategories.includes(userCategory) ? userCategory : 'Laundry Service & Dry Cleaner';
  }

  return userCategory;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category, phone, email, city, mapsUrl, businessDescription, isMapsMode, force, turnstileToken } = body;

    // Validate required fields
    if (!name || !category || !phone || !email || !city) {
      return NextResponse.json(
        { error: 'Semua kolom wajib diisi.' },
        { status: 400 }
      );
    }

    if (isMapsMode && !mapsUrl) {
      return NextResponse.json(
        { error: 'Link Google Maps wajib diisi jika Anda memilih tab "Ada di Maps".' },
        { status: 400 }
      );
    }

    if (!isMapsMode && !businessDescription) {
      return NextResponse.json(
        { error: 'Deskripsi bisnis wajib diisi jika Anda memilih tab "Belum di Maps".' },
        { status: 400 }
      );
    }

    if (!turnstileToken) {
      return NextResponse.json(
        { error: 'Validasi keamanan gagal. Harap centang Captcha.' },
        { status: 400 }
      );
    }

    // Verify Turnstile
    const turnstileData = new FormData();
    turnstileData.append('secret', process.env.TURNSTILE_SECRET_KEY || '');
    turnstileData.append('response', turnstileToken);

    try {
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: turnstileData
      });
      const verifyOutcome = await verifyRes.json();
      if (!verifyOutcome.success) {
        return NextResponse.json({ error: 'Validasi keamanan (CAPTCHA) gagal.' }, { status: 400 });
      }
    } catch (e) {
      return NextResponse.json({ error: 'Gagal memverifikasi keamanan.' }, { status: 500 });
    }

    const normalizedPhone = normalizePhone(phone);

    // 1. Check if this exact business has already been generated
    // If mapsUrl exists, use it. Otherwise, use phone + name to differentiate branches/businesses.
    let query = supabase.from('business_demos').select('slug');
    
    if (isMapsMode && mapsUrl) {
      query = query.eq('maps_url', mapsUrl);
    } else {
      query = query.eq('phone', normalizedPhone).eq('name', name);
    }

    const { data: existingData, error: findError } = await query.limit(1);

    if (findError) {
      return NextResponse.json({ error: 'Failed to verify existing records.' }, { status: 500 });
    }

    if (existingData && existingData.length > 0) {
      return NextResponse.json({ success: true, slug: existingData[0].slug, isExisting: true });
    }

    // 2. Hybrid Rate Limiting (Device Token max 3/24h & Shared IP max 20/24h)
    const deviceId = extractDeviceId(request, body.deviceId);
    const clientIp = getClientIp(request);

    const rateLimit = await checkRateLimit(request, deviceId);
    if (!rateLimit.allowed) {
      const resp = NextResponse.json(
        { error: rateLimit.message },
        { status: 429 }
      );
      resp.cookies.set('growfin_device_id', deviceId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      });
      return resp;
    }

    // 3. Validasi ke Google Places API (New)
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!googleApiKey) {
      return NextResponse.json({ error: 'Google Maps API Key not configured.' }, { status: 500 });
    }

    // Unfurl Maps URL to extract coordinates or use it as fallback
    let finalUrl = mapsUrl;
    try {
      const urlRes = await fetch(mapsUrl, { redirect: 'follow' });
      finalUrl = urlRes.url;
    } catch (e) {
      console.error("URL Resolve error:", e);
    }

    // Extract coordinates and Place Name from URL if possible
    let lat = null;
    let lng = null;
    let urlPlaceName = null;

    const coordMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || finalUrl.match(/search\/(-?\d+\.\d+),\+?(-?\d+\.\d+)/);
    if (coordMatch) {
      lat = parseFloat(coordMatch[1]);
      lng = parseFloat(coordMatch[2]);
    }

    const placeMatch = finalUrl.match(/\/place\/([^\/]+)\//);
    if (placeMatch) {
      urlPlaceName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
    }

    // Jika URL adalah link valid ke sebuah bisnis (bukan sekadar dropped pin jalanan), kita sudah tahu nama aslinya
    if (urlPlaceName && !force) {
      const inputName = name.toLowerCase();
      const realNameLower = urlPlaceName.toLowerCase();

      const ignoreWords = ['kopi', 'warung', 'toko', 'klinik', 'cafe', 'salon', 'apotek'];
      const inputWords = inputName.split(' ').filter((w: string) => w.length > 2 && !ignoreWords.includes(w));

      let hasMeaningfulMatch = false;
      if (inputWords.length === 0) {
        hasMeaningfulMatch = realNameLower.includes(inputName);
      } else {
        hasMeaningfulMatch = inputWords.some((w: string) => realNameLower.includes(w));
      }

      if (!hasMeaningfulMatch && !realNameLower.includes(inputName) && !inputName.includes(realNameLower)) {
        return NextResponse.json({
          needsConfirmation: true,
          realName: urlPlaceName
        });
      }
    }

    let places = [];

    if (isMapsMode) {
      const searchQuery = urlPlaceName ? urlPlaceName : (lat && lng ? name : `${name} ${city}`);

      const placesUrl = "https://places.googleapis.com/v1/places:searchText";
      const placesHeaders = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": googleApiKey,
        "X-Goog-FieldMask": "places.displayName,places.primaryType,places.rating,places.userRatingCount,places.formattedAddress,places.googleMapsUri,places.reviews"
      };

      const placesPayload: any = {
        textQuery: searchQuery,
        languageCode: "id"
      };

      if (lat && lng) {
        // Gunakan locationBias, searchText tidak support circle di locationRestriction
        placesPayload.locationBias = {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 100.0 // 100 meters
          }
        };
      }

      const placesRes = await fetch(placesUrl, {
        method: 'POST',
        headers: placesHeaders,
        body: JSON.stringify(placesPayload)
      });

      const placesData = await placesRes.json();
      places = placesData.places || [];

      // Jika pencarian menghasilkan bisnis yang namanya melenceng jauh (Fuzzy Match dari Google), kita validasi.
      if (places.length > 0 && !force) {
        const originalPlaceName = places[0].displayName?.text || "";
        const firstMatchName = originalPlaceName.toLowerCase();
        const inputName = name.toLowerCase();

        // Hitung kata yang cocok (abaikan kata generik seperti kopi, warung, toko, klinik)
        const ignoreWords = ['kopi', 'warung', 'toko', 'klinik', 'cafe', 'salon', 'apotek'];
        const inputWords = inputName.split(' ').filter((w: string) => w.length > 2 && !ignoreWords.includes(w));

        let hasMeaningfulMatch = false;
        if (inputWords.length === 0) {
          // Jika input hanya berisi kata generik (misal: "Kopi"), kita cek apakah input ada di nama hasil
          hasMeaningfulMatch = firstMatchName.includes(inputName);
        } else {
          hasMeaningfulMatch = inputWords.some((w: string) => firstMatchName.includes(w));
        }

        if (!hasMeaningfulMatch && !firstMatchName.includes(inputName) && !inputName.includes(firstMatchName)) {
          // Nama terlalu melenceng (Google mengembalikan rekomendasi acak atau nama aslinya beda)
          if (lat && lng) {
            // Jika URL valid (ada titik), mungkin mereka salah input nama. Minta konfirmasi!
            return NextResponse.json({
              needsConfirmation: true,
              realName: originalPlaceName
            });
          } else {
            // Jika tidak ada URL dan nama melenceng jauh, tolak langsung.
            places = [];
          }
        }
      }

      // Jika tidak ditemukan di Google Maps, tolak registrasi
      if (places.length === 0) {
        return NextResponse.json(
          { 
            error: 'Bisnis tidak ditemukan di Google Maps. Pastikan URL Maps valid atau Nama sesuai dengan yang terdaftar.',
            notFoundOnMaps: true
          },
          { status: 404 }
        );
      }
    }

    // Default fallback values untuk non-maps
    let realName = name;
    let realAddress = city;
    let rating = 4.9;
    let reviewCount = Math.floor(Math.random() * 50) + 10;
    let primaryType = 'store';
    let reviewsText = "";

    if (isMapsMode && places.length > 0) {
      // Ambil hasil teratas
      const place = places[0];
      realName = place.displayName?.text || name;
      realAddress = place.formattedAddress || city;
      rating = place.rating || 4.5;
      reviewCount = place.userRatingCount || 0;
      primaryType = place.primaryType || 'store';
      
      if (place.reviews && place.reviews.length > 0) {
        const goodReviews = place.reviews.filter((rev: any) => (rev.rating || 5) >= 4);
        if (goodReviews.length > 0) {
          reviewsText = "Data Ulasan Asli dari Pelanggan:\n";
          goodReviews.slice(0, 3).forEach((rev: any, idx: number) => {
            const author = rev.authorAttribution?.displayName || "Anonim";
            const rtg = rev.rating || 5;
            const text = rev.text?.text || "";
            const time = rev.relativePublishTimeDescription || "";
            reviewsText += `${idx + 1}. [${rtg}⭐] ${author} (${time}): "${text}"\n`;
          });
        }
      }
    } else {
      // No Maps Mode - use description provided by user
      reviewsText = `INFORMASI TAMBAHAN PENTING DARI PEMILIK BISNIS:\n"${businessDescription}"\n\nBuatkan 3 ulasan fiktif (mock review) yang sangat positif untuk bisnis ini berdasarkan deskripsi di atas. Gunakan nama orang Indonesia lokal.`;
    }

    // (photosText ditiadakan)

    // Override kategori jika terjadi mis-match (hanya relevan jika dari maps, jika non-maps gunakan category pilihan user)
    const adjustedCategory = isMapsMode ? mapPrimaryTypeToCategory(primaryType, category) : category;

    // 5. Generate JSON menggunakan Gemini AI
    const prompt = `
      Kamu adalah sistem AI pembuat struktur data UI cerdas.
      Buatkan data JSON (Metadata) untuk dirender di website katalog bisnis.
      
      Detail Bisnis:
      - Nama: ${realName}
      - Kategori Spesifik (Maps): ${primaryType}
      - Kategori Umum (Frontend): ${adjustedCategory}
      - Rating: ${rating} (${reviewCount} ulasan)
      - Telepon/WA: ${normalizedPhone}
      - Alamat: ${realAddress}
      
      ${reviewsText}

      
      Panduan Konten:
      1. Buatkan "tagline" yang menarik & profesional dalam bahasa Indonesia. WAJIB sangat singkat (Maksimal 6-8 kata, atau sekitar 50 karakter) agar tidak merusak estetika UI.
      2. Buatkan "hours" (Jam Operasional) berupa teks, misal: "Senin - Minggu: 09:00 - 22:00". Sebagai field terpisah di root JSON, buat juga "openTime" (misal "09:00") dan "closeTime" (misal "22:00").
      3. Tentukan "themeColor" hex code yang cocok dengan industri ${adjustedCategory}.
      4. Buatkan "fbType" (DINE_IN / QUICK_SERVICE / PRE_ORDER) khusus jika ini F&B. Jika bukan, kosongkan.
      5. Isi array "categories" minimal dengan ["Semua", "Kategori A", "Kategori B"].
      6. Buatkan array "menu" atau "products" berisi 4-5 layanan/produk utama dengan harga yang logis untuk di Indonesia.
         Format item: { "id": 1, "name": "...", "desc": "...", "price": "Rp ...", "category": "Kategori A", "duration": 45 }
      7. Jika bisnis ini Klinik/Salon/Jasa, buat object "doctor" { name, role, sampleChat: { user, doctor, recommendationTitle, recommendationDesc } }. 
         Jika ini Kafe/Retail, buat profil Admin Reservasi.
      8. Salin ulasan pelanggan ke property "reviews": [{ authorName, rating, text, time }].
      
      WAJIB kembalikan RAW JSON yang valid, tanpa awalan \`\`\`json.
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });

    const generatedText = result.response.text();
    let metadata;
    try {
      metadata = JSON.parse(generatedText);
      // Ensure the metadata overrides the basic fields with the correct ones
      metadata.rating = rating;
      metadata.reviewCount = reviewCount;
      metadata.address = realAddress;

      if (Array.isArray(metadata.reviews)) {
        metadata.reviews = metadata.reviews.map((rev: any) => ({
          ...rev,
          rating: Math.max(1, Math.min(5, Math.round(Number(rev.rating) || 5)))
        }));
      }
    } catch (e) {
      console.error('Failed to parse Gemini JSON:', e);
      return NextResponse.json({ error: 'AI Gagal memproses data. Coba lagi.' }, { status: 500 });
    }

    const slug = generateSlug(realName);

    // Determine correct default layout
    const templateType = resolveTemplateType(adjustedCategory);
    let defaultLayoutId = 'retail-theme-urban';

    if (templateType === 'fnb') {
      if (adjustedCategory.toLowerCase().includes('restaurant')) defaultLayoutId = 'fnb-theme-premium';
      else defaultLayoutId = 'fnb-theme-classic';
    } else if (templateType === 'grooming') {
      const isNailSpa = adjustedCategory.toLowerCase().includes('nail');
      if (isNailSpa) {
        defaultLayoutId = 'grooming-nailspa-default';
      } else {
        defaultLayoutId = 'grooming-beautynspa-default';
      }
    } else if (templateType === 'retail') {
      const cat = adjustedCategory.toLowerCase();
      const isGroceries = cat.includes('supermarket') || cat.includes('convenience') || cat.includes('grosir') || cat.includes('minimarket');
      const isElectronic = cat.includes('electronic') || cat.includes('gadget') || cat.includes('computer');

      if (isGroceries) {
        defaultLayoutId = 'retail-theme-fresh';
      } else if (isElectronic) {
        defaultLayoutId = 'retail-theme-tech';
      } else {
        // Includes shoe store, clothing store, etc
        defaultLayoutId = 'retail-theme-urban';
      }
    }

    // 6. Simpan ke Supabase beserta metadata & fomo_expires_at
    const fomoExpiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('business_demos')
      .insert([
        {
          slug,
          name: realName,
          category: adjustedCategory,
          phone: normalizedPhone,
          city,
          maps_url: mapsUrl,
          fomo_expires_at: fomoExpiresAt,
          metadata: { ...metadata, userEmail: email, deviceId, clientIp },
          draft_metadata: { ...metadata, userEmail: email, deviceId, clientIp },
          scraping_status: 'completed',
          layout_id: defaultLayoutId
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase Error:', error);
      return NextResponse.json({ error: 'Gagal menyimpan demo ke database.' }, { status: 500 });
    }

    // 7. Kirim Email Notifikasi via Resend di background (Non-blocking serverless via after())
    const previewUrl = `https://growfin.my.id/demo/${slug}`;
    after(async () => {
      try {
        await resend.emails.send({
          from: 'Growfin <hello@growfin.my.id>', // Make sure domain is verified on Resend
          to: email,
          subject: 'Website Bisnis Anda Sudah Siap',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
              <h2 style="color: #00b894;">Halo Pemilik ${realName}</h2>
              <p>Sistem kami telah selesai meracik website untuk bisnis <b>${realName}</b>.</p>
              <p>Silakan klik tombol di bawah ini untuk melihat hasilnya secara live:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${previewUrl}" style="background-color: #00b894; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">Lihat Website Saya</a>
              </div>
              <p>Atau copy link berikut: <br><a href="${previewUrl}" style="color: #00b894;">${previewUrl}</a></p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="font-size: 12px; color: #999;">Email ini dikirim secara otomatis. Jika Anda butuh bantuan, balas email ke growfin.id@gmail.com atau hubungi tim kami.</p>
            </div>
          `
        });
      } catch (e) {
        console.error('[Generate Route] Failed to send email in background:', e);
      }
    });

    const response = NextResponse.json({ success: true, slug: data.slug, isExisting: false });
    response.cookies.set('growfin_device_id', deviceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
    return response;

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
