// GET  /api/content  -> nội dung công khai cho landing page (không cần đăng nhập)
// POST /api/content  -> lưu nội dung từ trang /admin (cần token)

import { getContent, saveContent } from '../lib/store.js';
import { requireAuth } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const content = await getContent();
    // Cho phép CDN cache ngắn, đồng thời phục vụ bản cũ trong lúc revalidate
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=300');
    return res.status(200).json({ ok: true, content });
  }

  if (req.method === 'POST') {
    if (!requireAuth(req, res)) return;
    const content = req.body && req.body.content;
    if (!content || typeof content !== 'object') {
      return res.status(400).json({ ok: false, error: 'Dữ liệu không hợp lệ' });
    }
    try {
      await saveContent(content);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('saveContent error:', err);
      return res.status(500).json({ ok: false, error: String(err.message || err) });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
