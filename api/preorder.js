// Vercel Serverless Function: nhận đơn pre-order từ form popup,
// ghi vào Google Sheet (qua Google Apps Script) và Supabase (nếu cấu hình).
//
// URL Apps Script lấy từ phần Cài đặt của trang /admin; nếu chưa nhập ở đó thì
// dùng biến môi trường GOOGLE_SCRIPT_URL.

import { getContent } from '../lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { name, phone, email, grade, qty, address, note, source, userAgent } = req.body || {};

  // Validate phía server
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ ok: false, error: 'Thiếu họ tên' });
  }
  const cleanPhone = String(phone || '').replace(/[\s.\-]/g, '');
  if (!/^(0|\+84)\d{9,10}$/.test(cleanPhone)) {
    return res.status(400).json({ ok: false, error: 'Số điện thoại không hợp lệ' });
  }
  if (!address || !String(address).trim()) {
    return res.status(400).json({ ok: false, error: 'Thiếu địa chỉ' });
  }

  // Giá và giới hạn số lượng lấy từ CMS để luôn khớp với trang hiển thị
  const content = await getContent();
  const settings = content.settings || {};
  const unitPrice = Number(settings.unitPrice) || 239000;
  const maxQty = Number(settings.maxQty) || 20;
  const scriptUrl = settings.googleScriptUrl || process.env.GOOGLE_SCRIPT_URL || '';

  const cleanQty = Math.min(Math.max(parseInt(qty, 10) || 1, 1), maxQty);

  const record = {
    createdAt: new Date().toISOString(),
    name: String(name).trim().slice(0, 200),
    phone: cleanPhone,
    email: String(email || '').trim().slice(0, 200),
    grade: String(grade || '').slice(0, 50),
    qty: cleanQty,
    total: cleanQty * unitPrice,
    address: String(address).trim().slice(0, 500),
    note: String(note || '').trim().slice(0, 500),
    source: String(source || '').slice(0, 300),
    userAgent: String(userAgent || '').slice(0, 300)
  };

  const results = { sheet: false, supabase: false };

  // 1) Ghi vào Google Sheet qua Apps Script
  if (scriptUrl) {
    try {
      const r = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      results.sheet = r.ok;
    } catch (err) {
      console.error('Google Sheet error:', err);
    }
  }

  // 2) Ghi song song vào Supabase (nếu có cấu hình)
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    try {
      const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/preorders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: process.env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({
          name: record.name,
          phone: record.phone,
          email: record.email,
          grade: record.grade,
          qty: record.qty,
          total: record.total,
          address: record.address,
          note: record.note,
          source: record.source,
          user_agent: record.userAgent
        })
      });
      results.supabase = r.ok;
      if (!r.ok) console.error('Supabase error:', await r.text());
    } catch (err) {
      console.error('Supabase error:', err);
    }
  }

  // Thành công nếu ghi được ít nhất 1 nơi
  if (results.sheet || results.supabase) {
    return res.status(200).json({ ok: true, saved: results, total: record.total });
  }
  return res.status(502).json({ ok: false, error: 'Không lưu được đơn hàng', saved: results });
}
