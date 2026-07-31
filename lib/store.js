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
  const res = await fetch(url(TABLE), {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify({ id: ROW_ID, data, updated_at: new Date().toISOString() })
  });
  if (!res.ok) throw new Error(await res.text());
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
