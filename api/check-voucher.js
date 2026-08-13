import { supabaseReady } from '../lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { code, pkgId } = req.query;
  const vc = String(code || '').trim().toUpperCase();
  
  if (!vc) {
    return res.status(400).json({ ok: false, error: 'Vui lòng nhập mã voucher' });
  }

  if (!supabaseReady()) {
    return res.status(500).json({ ok: false, error: 'Hệ thống voucher đang bảo trì' });
  }

  if (pkgId === 'combo') {
    return res.status(400).json({ ok: false, error: 'Mã voucher không áp dụng cho gói Combo' });
  }

  try {
    const url = `${process.env.SUPABASE_URL}/rest/v1/vouchers?code=eq.${encodeURIComponent(vc)}&select=is_used`;
    const r = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      }
    });

    if (!r.ok) throw new Error('DB error');
    
    const rows = await r.json();
    if (!rows || rows.length === 0) {
      return res.status(400).json({ ok: false, error: 'Mã voucher không tồn tại' });
    }
    
    if (rows[0].is_used) {
      return res.status(400).json({ ok: false, error: 'Mã voucher đã được sử dụng' });
    }

    let discount = 0;
    if (pkgId === '1') {
      discount = 44000;
    } else if (pkgId === '2') {
      discount = 58000;
    } else {
      // Fallback
      discount = 44000; 
    }

    return res.status(200).json({ ok: true, discount });
  } catch (err) {
    console.error('check-voucher error:', err);
    return res.status(500).json({ ok: false, error: 'Lỗi hệ thống khi kiểm tra mã voucher' });
  }
}
