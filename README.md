# Landing Page Pre-order + CMS — Sổ Tay Thiên Tài Toán Lớp 1–5 (MathCA)

Landing page bán hàng có form popup đặt trước, kèm **trang quản trị `/admin`** để sửa mọi nội dung
theo từng section, cài Facebook Pixel / Google Analytics và nối với Google Sheet — không cần đụng vào code.

Stack: **GitHub → Vercel** (hosting + serverless API), **Supabase** (database), **Google Sheet** (nơi xem đơn hàng quen thuộc).

## Cấu trúc file

| File | Vai trò |
|---|---|
| `index.html` | Landing page + popup đặt hàng. Tự nạp nội dung từ CMS khi mở trang |
| `admin/index.html` | Trang quản trị CMS (truy cập tại `/admin`) |
| `lib/content.js` | Nội dung mặc định + hàm gộp dữ liệu |
| `lib/store.js` | Đọc/ghi Supabase |
| `lib/auth.js` | Đăng nhập admin bằng mật khẩu + token có chữ ký |
| `api/content.js` | `GET` trả nội dung cho landing page · `POST` lưu nội dung từ CMS |
| `api/preorder.js` | Nhận đơn đặt trước → ghi vào Google Sheet + Supabase |
| `api/login.js` | Xác thực mật khẩu quản trị |
| `api/orders.js` | Trả danh sách đơn cho mục "Đơn hàng" trong CMS |
| `google-apps-script.gs` | Code dán vào Apps Script của Google Sheet |
| `supabase-setup.sql` | Tạo 2 bảng `preorders` và `site_content` |

**Luồng đặt hàng:** form popup → `POST /api/preorder` → Google Sheet + Supabase.
**Luồng nội dung:** `/admin` → `POST /api/content` → Supabase → landing page đọc qua `GET /api/content`.

Mọi khóa bí mật nằm ở biến môi trường phía server; trình duyệt của khách không bao giờ thấy chúng.

---

## Bước 1 — Supabase

1. Vào Supabase Dashboard → **SQL Editor**, dán và chạy toàn bộ `supabase-setup.sql`.
2. Vào **Project Settings → API**, copy `Project URL` và **`service_role` key**.

> `service_role` key chỉ được đặt trong biến môi trường của Vercel, tuyệt đối không dán vào file HTML. Hai bảng đều bật RLS và không có policy cho `anon`, nên chỉ server mới đọc/ghi được.

## Bước 2 — Google Sheet nhận đơn

1. Tạo Google Sheet mới, ví dụ **MathCA Preorders**.
2. **File → Cài đặt (Settings)** → đặt múi giờ **(GMT+07:00) Bangkok/Hanoi** để cột thời gian đúng.
3. **Tiện ích mở rộng (Extensions) → Apps Script**, xóa code mẫu, dán toàn bộ `google-apps-script.gs`.
4. **Triển khai (Deploy) → Tùy chọn triển khai mới (New deployment)**:
   - Loại: **Ứng dụng web (Web app)**
   - Thực thi với tư cách: **Tôi (Me)**
   - Ai có quyền truy cập: **Bất kỳ ai (Anyone)** ← bắt buộc; chọn "Anyone with Google account" là Vercel gọi sẽ lỗi
5. Copy **URL ứng dụng web** dạng `https://script.google.com/macros/s/.../exec`.

URL này sẽ dán vào **`/admin` → Cài đặt → Google Apps Script Web App URL** (không cần sửa code).
Muốn thử ngay: chạy hàm `testAppend` trong Apps Script, một dòng test sẽ xuất hiện trong Sheet.

## Bước 3 — Đưa lên GitHub và deploy Vercel

```bash
git init
git add .
git commit -m "MathCA landing page + CMS"
git branch -M main
git remote add origin https://github.com/<tai-khoan>/<ten-repo>.git
git push -u origin main
```

Trên [vercel.com](https://vercel.com): **Add New → Project → Import** repo vừa push.
Framework Preset để **Other**, không cần build command.

Trước khi bấm Deploy, mở **Environment Variables** và thêm:

| Tên biến | Bắt buộc | Giá trị |
|---|---|---|
| `ADMIN_PASSWORD` | ✅ | Mật khẩu đăng nhập `/admin` — đặt chuỗi dài, khó đoán |
| `SUPABASE_URL` | ✅ | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | ✅ | service_role key ở Bước 1 |
| `GOOGLE_SCRIPT_URL` | ⬜ | Dự phòng nếu chưa nhập trong CMS |
| `ADMIN_SECRET` | ⬜ | Chuỗi ngẫu nhiên để ký token; bỏ trống thì dùng `ADMIN_PASSWORD` |

Bấm **Deploy**, rồi vào `https://<ten-site>.vercel.app/admin` để đăng nhập.

> Sửa biến môi trường sau khi đã deploy thì phải **Redeploy** mới có hiệu lực.
> Đổi `ADMIN_PASSWORD` sẽ khiến mọi phiên đăng nhập hiện tại bị đăng xuất.

---

## Dùng trang quản trị `/admin`

Đăng nhập bằng `ADMIN_PASSWORD`. Cột trái là danh sách section, sửa xong bấm **💾 Lưu thay đổi**.
Landing page cập nhật sau tối đa ~30 giây (thời gian cache CDN).

### Cài đặt & Tracking
- **Facebook Pixel ID** — chỉ nhập dãy số ID (lấy ở Meta Events Manager), không dán cả đoạn script.
  Pixel tự bắn `PageView`, `InitiateCheckout` khi khách mở form, `Lead` + `Purchase` khi đặt hàng thành công.
- **GA4 Measurement ID** — dạng `G-XXXXXXXXXX`. Tương ứng bắn `begin_checkout`, `generate_lead`, `purchase` kèm giá trị đơn hàng.
- **Google Apps Script Web App URL** — nơi đơn hàng được ghi vào Sheet.
- **Link Google Sheet** — tạo nút mở nhanh bảng tính trong mục Đơn hàng.
- **Giá bán / giá gạch ngang / số lượng tối đa / tồn kho / hạn đếm ngược** — sửa một chỗ, toàn trang đổi theo.

Để trống ô Pixel hoặc GA4 thì trang **không nạp** script tracking đó — tiện khi chưa chạy quảng cáo.

### Sửa nội dung
Mỗi section (Hero, Lợi ích, Thư viện ảnh, FAQ…) có ô nhập riêng. Các danh sách hỗ trợ
**thêm / xóa / đổi thứ tự** bằng nút `+`, `✕`, `↑`, `↓`. Ảnh có ô xem trước ngay khi dán URL.

Trong mọi ô nội dung có thể chèn biến động, hệ thống tự thay bằng số thật:

| Biến | Kết quả |
|---|---|
| `{price}` | Giá bán, ví dụ `239.000đ` |
| `{oldPrice}` | Giá gạch ngang |
| `{stockLeft}` / `{stockTotal}` | Số suất còn lại / tổng số suất |
| `{maxQty}` | Giới hạn số lượng mỗi đơn |

### Đơn hàng
Xem 200 đơn gần nhất lấy từ Supabase, kèm nút mở Google Sheet.

---

## Chạy thử ở máy

```bash
npm i -g vercel
vercel dev
```

Sao chép `.env.example` thành `.env.local` và điền giá trị thật. Mở `http://localhost:3000` (landing) và `http://localhost:3000/admin` (CMS).

Mở thẳng `index.html` bằng trình duyệt thì giao diện vẫn xem được với **nội dung mặc định**, nhưng CMS và form đặt hàng không hoạt động vì thiếu các API.

## Thiết kế chống hỏng

- Landing page có sẵn nội dung tĩnh mặc định trong HTML. Nếu Supabase hoặc `/api/content` lỗi, trang vẫn hiển thị đầy đủ thay vì trắng màn hình.
- Nội dung lưu ở CMS được gộp lên trên bản mặc định, nên thêm field mới về sau không làm vỡ dữ liệu đã lưu.
- Đơn hàng ghi vào Google Sheet **và** Supabase; chỉ cần một nơi thành công là khách vẫn nhận được màn hình cảm ơn, tránh mất đơn khi Apps Script hết quota.
- Form validate hai lớp (trình duyệt + server), có honeypot ẩn chặn bot, giới hạn độ dài mọi trường trước khi ghi.

## Gợi ý nên làm thêm

- Thêm thông báo Zalo/Telegram khi có đơn mới (thêm một `fetch` nữa trong `api/preorder.js`).
- Nếu nhiều người cùng sửa CMS, cân nhắc chuyển sang Supabase Auth thay cho mật khẩu dùng chung.
- Cập nhật `stockLeft` trong CMS theo số đơn thực tế để thanh tồn kho luôn đúng.
