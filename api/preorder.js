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

  const results = { sheet: false, supabase: false };

  // Lấy cài đặt CMS song song với việc chuẩn bị dữ liệu
  // → không block luồng ghi
  const contentPromise = getContent().catch(() => ({}));

  // Tạo record với giá mặc định trước, cập nhật sau khi CMS trả về
  const cleanQty = Math.min(Math.max(parseInt(qty, 10) || 1, 1), 20);

  const record = {
    createdAt: new Date().toISOString(),
    name: String(name).trim().slice(0, 200),
    phone: cleanPhone,
    email: String(email || '').trim().slice(0, 200),
    grade: String(grade || '').slice(0, 50),
    qty: cleanQty,
    total: 0,
    address: String(address).trim().slice(0, 500),
    note: String(note || '').trim().slice(0, 500),
    source: String(source || '').slice(0, 300),
    userAgent: String(userAgent || '').slice(0, 300)
  };

  // Chờ CMS để lấy giá chính xác + script URL
  const content = await contentPromise;
  const settings = content.settings || {};
  const unitPrice = Number(settings.unitPrice) || 239000;
  const maxQty = Number(settings.maxQty) || 20;
  const scriptUrl = settings.googleScriptUrl || process.env.GOOGLE_SCRIPT_URL || '';

  record.qty = Math.min(record.qty, maxQty);
  record.total = record.qty * unitPrice;

  // Ghi Google Sheet + Supabase SONG SONG (không chờ nhau)
  const tasks = [];

  if (scriptUrl) {
    tasks.push(
      fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      })
        .then(r => { results.sheet = r.ok; })
        .catch(err => { console.error('Google Sheet error:', err); })
    );
  }

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    tasks.push(
      fetch(`${process.env.SUPABASE_URL}/rest/v1/preorders`, {
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
        .then(async r => {
          results.supabase = r.ok;
          if (!r.ok) console.error('Supabase error:', await r.text());
        })
        .catch(err => { console.error('Supabase error:', err); })
    );
  }

  await Promise.allSettled(tasks);

  // Thành công nếu ghi được ít nhất 1 nơi
  if (results.sheet || results.supabase) {
    return res.status(200).json({ ok: true, saved: results, total: record.total });
  }
  return res.status(502).json({ ok: false, error: 'Không lưu được đơn hàng', saved: results });
}
