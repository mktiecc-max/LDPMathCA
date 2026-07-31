// Vercel Serverless Function: nhận đơn pre-order từ form popup.
// Ưu tiên ghi Supabase (nhanh ~200ms) → trả response ngay cho khách.
// Google Sheet được đẩy ở background (fire-and-forget), không block response.
//
// URL Apps Script lấy từ phần Cài đặt của trang /admin; nếu chưa nhập ở đó thì
// dùng biến môi trường GOOGLE_SCRIPT_URL.

import { getContent } from '../lib/store.js';

const ipMap = new Map();

function checkRateLimit(ip) {
  if (!ip) return true;
  const now = Date.now();
  const last = ipMap.get(ip) || 0;
  if (now - last < 30000) return false;
  ipMap.set(ip, now);
  if (ipMap.size > 1000) ipMap.clear();
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ ok: false, error: 'Bạn đang thao tác quá nhanh, vui lòng chờ một lát.' });
  }

  const { name, phone, email, grade, qty, address, note, source, userAgent, total: reqTotal, package: pkgName, website } = req.body || {};

  // P0-2: Honeypot check
  if (website) {
    return res.status(200).json({ ok: true, total: reqTotal }); // Fake success for bots
  }

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

  // P0-1: Tính giá server-side từ content
  const packages = (content.form && content.form.packages) || [];
  const chosen = packages.find(p => p.name === pkgName) || packages[0];
  const serverTotal = chosen ? (Number(chosen.new) || 0) : cleanQty * unitPrice;

  const baseRecord = {
    createdAt: new Date().toISOString(),
    name: String(name).trim().slice(0, 200),
    phone: cleanPhone,
    email: String(email || '').trim().slice(0, 200),
    grade: String(grade || '').slice(0, 50),
    qty: cleanQty,
    total: serverTotal,
    address: String(address).trim().slice(0, 500),
    note: String(note || '').trim().slice(0, 500),
    source: String(source || '').slice(0, 300),
    userAgent: String(userAgent || '').slice(0, 300),
    pkgName: String(pkgName || '').slice(0, 200)
  };

  // Google Sheet payload: replaces qty with package name, and uses raw note.
  // Property order is preserved for Google Apps Script Object.values() parsing.
  const sheetRecord = {
    createdAt: baseRecord.createdAt,
    name: baseRecord.name,
    phone: baseRecord.phone,
    email: baseRecord.email,
    grade: baseRecord.grade,
    package: baseRecord.pkgName,
    total: baseRecord.total,
    address: baseRecord.address,
    note: baseRecord.note,
    source: baseRecord.source,
    userAgent: baseRecord.userAgent
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
        name: baseRecord.name,
        phone: baseRecord.phone,
        email: baseRecord.email,
        grade: baseRecord.pkgName || baseRecord.grade, // Hiển thị package vào cột Lớp trên CMS
        qty: baseRecord.qty,
        total: baseRecord.total,
        address: baseRecord.address,
        note: baseRecord.note,
        source: baseRecord.source,
        user_agent: baseRecord.userAgent
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
      body: JSON.stringify(sheetRecord)
    }).catch(err => console.error('Google Sheet error:', err));
    
    tasks.push(pGs);
  }

  // Đợi cả 2 (hoặc 1) hoàn thành. Vercel Serverless yêu cầu await nếu không sẽ bị freeze process.
  await Promise.allSettled(tasks);

  // ========== 3) TRẢ RESPONSE ==========
  // Ưu tiên check Supabase thành công. Nếu không cấu hình Supabase nhưng GS thành công thì vẫn báo ok.
  if (supabaseOk || (!process.env.SUPABASE_URL && scriptUrl)) {
    return res.status(200).json({ ok: true, total: baseRecord.total });
  }
  return res.status(502).json({ ok: false, error: 'Không lưu được đơn hàng' });
}
