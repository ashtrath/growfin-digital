import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { siteConfig, PackageTier } from '@/lib/site-config';
const midtransClient = require('midtrans-client');

export async function POST(request: Request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const { slug, amount, package_tier, user_id, transaction_type } = await request.json();

    if (!user_id) {
       return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // 1. Validasi tipe transaksi: 'activation' | 'upgrade' | 'renewal' (default: 'activation')
    const allowedTypes = ['activation', 'upgrade', 'renewal'];
    const finalTxType = allowedTypes.includes(transaction_type) ? transaction_type : 'activation';

    // 2. Validasi harga berdasarkan siteConfig.pricing (harga penuh paket tujuan tanpa potongan prorata)
    const targetTier: PackageTier = (package_tier as PackageTier) || 'instan';
    const matchedPackage = siteConfig.pricing.find((p) => p.id === targetTier);
    const finalAmount = matchedPackage?.priceNumeric || amount || 299000;

    // Get business demo ID
    const { data: businessData, error: businessError } = await supabaseAdmin
      .from('business_demos')
      .select('id')
      .eq('slug', slug)
      .single();
      
    if (businessError || !businessData) {
       throw new Error('Business not found');
    }

    // Ensure profile exists to satisfy foreign key constraints
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({ id: user_id }, { onConflict: 'id' });

    if (profileError) {
       console.error('Profile Upsert Error:', profileError);
       throw new Error('Failed to synchronize user profile.');
    }

    // Insert pending transaction with snapshot_tier and transaction_type
    const { data: trxData, error: trxError } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id,
        business_demo_id: businessData.id,
        amount: finalAmount,
        status: 'pending',
        snapshot_tier: targetTier,
        transaction_type: finalTxType
      })
      .select('id')
      .single();

    if (trxError) throw trxError;

    // Create Snap API instance
    const isProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true';
    let snap = new midtransClient.Snap({
      isProduction,
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY
    });

    let parameter = {
      "transaction_details": {
        "order_id": trxData.id, // Use our DB transaction ID
        "gross_amount": finalAmount
      },
      "credit_card": {
        "secure": true
      },
      "customer_details": {
        "first_name": "Growfin",
        "last_name": "Client",
      }
    };

    const transaction = await snap.createTransaction(parameter);
    
    // Also save package_tier tentatively on the business demo (or update later)
    await supabaseAdmin
      .from('business_demos')
      .update({ package_tier, user_id })
      .eq('id', businessData.id);

    return NextResponse.json({ token: transaction.token });

  } catch (error: any) {
    console.error('Midtrans/DB Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
