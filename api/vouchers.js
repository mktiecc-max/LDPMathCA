import { listVouchers, addVouchers, deleteVoucher, supabaseReady } from '../lib/store.js';
import { requireAuth } from '../lib/auth.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;

  if (!supabaseReady()) {
    return res.status(200).json({ ok: false, error: 'Chưa cấu hình Supabase' });
  }

  try {
    if (req.method === 'GET') {
      const vouchers = await listVouchers();
      return res.status(200).json({ ok: true, vouchers });
    }
    
    if (req.method === 'POST') {
      const { codes } = req.body || {};
      if (!Array.isArray(codes)) return res.status(400).json({ ok: false, error: 'Invalid payload' });
      await addVouchers(codes);
      return res.status(200).json({ ok: true });
    }
    
    if (req.method === 'DELETE') {
      const { code } = req.body || {};
      if (!code) return res.status(400).json({ ok: false, error: 'Missing code' });
      await deleteVoucher(code);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('vouchers api error:', err);
    return res.status(500).json({ ok: false, error: String(err.message || err) });
  }
}
