// Xác thực đơn giản cho trang /admin: mật khẩu đặt ở biến môi trường
// ADMIN_PASSWORD, đăng nhập thành công nhận về token có chữ ký HMAC + hạn dùng.
// Không lưu session ở server nên chạy tốt trên serverless.

import crypto from 'crypto';

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 giờ

function secret() {
  return process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || '';
}

function sign(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('hex');
}

export function isConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function checkPassword(input) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected) return false;
  const a = Buffer.from(String(input || ''));
  const b = Buffer.from(expected);
  // So sánh chống timing attack; độ dài khác nhau cũng phải trả về false
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function createToken() {
  const exp = String(Date.now() + TOKEN_TTL_MS);
  return `${exp}.${sign(exp)}`;
}

export function verifyToken(token) {
  if (!token || !secret()) return false;
  const [exp, sig] = String(token).split('.');
  if (!exp || !sig) return false;
  if (Number(exp) < Date.now()) return false;
  const expected = sign(exp);
  if (sig.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

// Đọc token từ header Authorization: Bearer xxx
export function requireAuth(req, res) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!verifyToken(token)) {
    res.status(401).json({ ok: false, error: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại' });
    return false;
  }
  return true;
}
