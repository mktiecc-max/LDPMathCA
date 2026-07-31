// Vercel Serverless Function: nhận đơn pre-order từ form popup.
// Ưu tiên ghi Supabase (nhanh ~200ms) → trả response ngay cho khách.
// Google Sheet được đẩy ở background (fire-and-forget), không block response.
//
// URL Apps Script lấy từ phần Cài đặt của trang /admin; nếu chưa nhập ở đó thì
// dùng biến môi trường GOOGLE_SCRIPT_URL.

import { getContent } from '../lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { name, phone, email, grade, qty, address, note, source, userAgent, total: reqTotal, package: pkgName } = req.body || {};

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

  // Lấy cài đặt CMS (giá, maxQty, script URL)
  let content = {};
  try { content = await getContent(); } catch (_) { /* dùng mặc định */ }
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
    total: reqTotal ? parseInt(reqTotal, 10) : (cleanQty * unitPrice),
    address: String(address).trim().slice(0, 500),
    note: String((pkgName ? `[Gói: ${pkgName}] ` : '') + (note || '')).trim().slice(0, 500),
    source: String(source || '').slice(0, 300),
    userAgent: String(userAgent || '').slice(0, 300)
  };

  // Chuẩn bị các Promise để chạy song song
  const tasks = [];

  // ========== 1) GHI SUPABASE ==========
  let supabaseOk = false;
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    const pSupa = fetch(`${process.env.SUPABASE_URL}/rest/v1/preorders`, {
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
    })
    .then(r => { supabaseOk = r.ok; return r.ok ? r : Promise.reject('Supa fail'); })
    .catch(err => console.error('Supabase error:', err));
    
    tasks.push(pSupa);
  }

  // ========== 2) GOOGLE SHEET ==========
  if (scriptUrl) {
    const pGs = fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    }).catch(err => console.error('Google Sheet error:', err));
    
    tasks.push(pGs);
  }

  // Đợi cả 2 (hoặc 1) hoàn thành. Vercel Serverless yêu cầu await nếu không sẽ bị freeze process.
  await Promise.allSettled(tasks);

  // ========== 3) TRẢ RESPONSE ==========
  // Ưu tiên check Supabase thành công. Nếu không cấu hình Supabase nhưng GS thành công thì vẫn báo ok.
  if (supabaseOk || (!process.env.SUPABASE_URL && scriptUrl)) {
    return res.status(200).json({ ok: true, total: record.total });
  }
  return res.status(502).json({ ok: false, error: 'Không lưu được đơn hàng' });
}
