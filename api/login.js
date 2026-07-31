// POST /api/login {password} -> {token}

import { checkPassword, createToken, isConfigured } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!isConfigured()) {
    return res.status(500).json({
      ok: false,
      error: 'Chưa đặt biến môi trường ADMIN_PASSWORD trên Vercel'
    });
  }

  // Làm chậm nhẹ để hạn chế dò mật khẩu tự động
  await new Promise((r) => setTimeout(r, 400));

  if (!checkPassword(req.body && req.body.password)) {
    return res.status(401).json({ ok: false, error: 'Mật khẩu không đúng' });
  }
  return res.status(200).json({ ok: true, token: createToken() });
}
