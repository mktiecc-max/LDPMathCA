// Lớp đọc/ghi dữ liệu qua Supabase REST (dùng service_role key ở phía server).

import { DEFAULT_CONTENT, mergeContent } from './content.js';

const TABLE = 'site_content';
const ROW_ID = 1;

export function supabaseReady() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
}

function headers(extra = {}) {
  const key = process.env.SUPABASE_SERVICE_KEY;
  return {
    'Content-Type': 'application/json',
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra
  };
}

function url(path) {
  return `${process.env.SUPABASE_URL}/rest/v1/${path}`;
}

// Trả về nội dung đã gộp với bản mặc định. Supabase lỗi/chưa cấu hình thì
// vẫn trả bản mặc định để trang chạy bình thường.
export async function getContent() {
  if (!supabaseReady()) return DEFAULT_CONTENT;
  try {
    const res = await fetch(url(`${TABLE}?id=eq.${ROW_ID}&select=data`), { headers: headers() });
    if (!res.ok) throw new Error(await res.text());
    const rows = await res.json();
    if (!rows.length || !rows[0].data) return DEFAULT_CONTENT;
    return mergeContent(DEFAULT_CONTENT, rows[0].data);
  } catch (err) {
    console.error('getContent error:', err);
    return DEFAULT_CONTENT;
  }
}

export async function saveContent(data) {
  if (!supabaseReady()) {
    throw new Error('Chưa cấu hình SUPABASE_URL / SUPABASE_SERVICE_KEY trên Vercel');
  }
  const body = JSON.stringify({ id: ROW_ID, data, updated_at: new Date().toISOString() });

  // Thử POST upsert trước, nếu fetch thất bại thì fallback sang PATCH
  async function tryPost() {
    const res = await fetch(url(TABLE), {
      method: 'POST',
      headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body
    });
    if (!res.ok) throw new Error('Supabase POST ' + res.status + ': ' + (await res.text()));
  }

  async function tryPatch() {
    const res = await fetch(url(`${TABLE}?id=eq.${ROW_ID}`), {
      method: 'PATCH',
      headers: headers({ Prefer: 'return=minimal' }),
      body: JSON.stringify({ data, updated_at: new Date().toISOString() })
    });
    if (!res.ok) throw new Error('Supabase PATCH ' + res.status + ': ' + (await res.text()));
  }

  // Lần 1: POST upsert
  try {
    await tryPost();
    return;
  } catch (err1) {
    const cause1 = err1.cause ? ` (cause: ${err1.cause.code || err1.cause.message || err1.cause})` : '';
    console.error('saveContent POST failed:', err1.message + cause1);

    // Lần 2: retry POST sau 500ms
    try {
      await new Promise(r => setTimeout(r, 500));
      await tryPost();
      return;
    } catch (err2) {
      const cause2 = err2.cause ? ` (cause: ${err2.cause.code || err2.cause.message || err2.cause})` : '';
      console.error('saveContent POST retry failed:', err2.message + cause2);

      // Lần 3: fallback sang PATCH
      try {
        await tryPatch();
        return;
      } catch (err3) {
        const cause3 = err3.cause ? ` (cause: ${err3.cause.code || err3.cause.message || err3.cause})` : '';
        const detail = `POST: ${err1.message}${cause1} | PATCH: ${err3.message}${cause3}`;
        console.error('saveContent all attempts failed:', detail);
        throw new Error('Không lưu được: ' + detail);
      }
    }
  }
}

export async function listOrders(limit = 100) {
  if (!supabaseReady()) return [];
  const res = await fetch(
    url(`preorders?select=*&order=created_at.desc&limit=${Math.min(limit, 500)}`),
    { headers: headers() }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listVouchers() {
  if (!supabaseReady()) return [];
  const res = await fetch(
    url(`vouchers?select=*&order=code.asc`),
    { headers: headers() }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function addVouchers(codes) {
  if (!supabaseReady()) throw new Error('Chưa cấu hình SUPABASE_URL');
  if (!codes || !codes.length) return;
  const payload = codes.map(c => ({ code: String(c).trim().toUpperCase(), is_used: false }));
  const res = await fetch(url('vouchers'), {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=ignore-duplicates,return=minimal' }),
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function deleteVoucher(code) {
  if (!supabaseReady()) throw new Error('Chưa cấu hình SUPABASE_URL');
  const res = await fetch(url(`vouchers?code=eq.${encodeURIComponent(code)}`), {
    method: 'DELETE',
    headers: headers()
  });
  if (!res.ok) throw new Error(await res.text());
}
