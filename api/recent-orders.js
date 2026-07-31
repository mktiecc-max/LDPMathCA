// GET /api/recent-orders -> Trả về danh sách đơn hàng đã ẩn danh (ẩn SĐT/Tên họ) cho popup.

import { supabaseReady } from '../lib/store.js';

function anonymizeName(name) {
  if (!name) return 'Khách hàng';
  const parts = name.trim().split(' ');
  if (parts.length <= 1) return name;
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (parts.length === 2) return `${first} ***`;
  return `${first} *** ${last}`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (!supabaseReady()) {
    return res.status(200).json({ ok: true, data: [] });
  }

  try {
    const key = process.env.SUPABASE_SERVICE_KEY;
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/preorders?select=name,created_at&order=created_at.desc&limit=50`, {
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
      }
    });

    if (!response.ok) {
      return res.status(500).json({ ok: false, error: 'Cannot fetch orders' });
    }

    const orders = await response.json();
    const formattedOrders = orders.map(o => {
      const diffMs = new Date() - new Date(o.created_at);
      const diffMins = Math.floor(diffMs / 60000);
      let timeStr = 'vừa xong';
      if (diffMins > 0 && diffMins < 60) timeStr = `${diffMins} phút trước`;
      else if (diffMins >= 60 && diffMins < 1440) timeStr = `${Math.floor(diffMins/60)} giờ trước`;
      else if (diffMins >= 1440) timeStr = `${Math.floor(diffMins/1440)} ngày trước`;

      return {
        name: anonymizeName(o.name),
        time: timeStr
      };
    });

    return res.status(200).json({ ok: true, data: formattedOrders });
  } catch (err) {
    console.error('Recent orders error:', err);
    return res.status(500).json({ ok: false, error: 'Internal Server Error' });
  }
}
