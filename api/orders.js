// GET /api/orders -> danh sách đơn pre-order gần nhất (chỉ cho trang /admin)

import { listOrders, supabaseReady } from '../lib/store.js';
import { requireAuth } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!requireAuth(req, res)) return;

  if (!supabaseReady()) {
    return res.status(200).json({ ok: true, orders: [], note: 'Chưa cấu hình Supabase' });
  }
  try {
    const orders = await listOrders(200);
    return res.status(200).json({ ok: true, orders });
  } catch (err) {
    console.error('listOrders error:', err);
    return res.status(500).json({ ok: false, error: String(err.message || err) });
  }
}
