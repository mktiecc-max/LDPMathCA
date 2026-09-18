# Kế Hoạch Tích Hợp POSCAKE Auto-Confirm

Kế hoạch dưới đây mô tả cách chúng ta sẽ tích hợp thanh toán tự động (QR) cho website MathCA hiện tại bằng cách gọi API sang hệ thống POSCAKE của bạn.

## User Review Required

> [!IMPORTANT]
> - Để thực hiện, tôi sẽ cần API Token của POSCAKE và ID của Cửa hàng (Shop ID). Tạm thời tôi sẽ cấu hình thông qua các biến môi trường, sau này bạn sẽ điền chúng vào Vercel (hoặc cấu hình của bạn).
> - Tính năng Realtime (tự động cập nhật giao diện) sẽ sử dụng Supabase Realtime. Bạn cần bật tính năng Realtime cho bảng `preorders` trong cài đặt của Supabase.
> - Xin hãy xem qua và phản hồi nếu bạn đồng ý với luồng này.

## Open Questions

> [!WARNING]
> - Hệ thống POSCAKE của bạn quy định **nội dung chuyển khoản** (để tự động khớp đơn) là gì? (Ví dụ: Mã đơn hàng trên POSCAKE, hay số điện thoại khách hàng, hay một tiền tố đặc biệt như `MATHCA [SDT]`). Tôi cần biết chính xác cú pháp này để tạo mã QR chuẩn xác.
> - POSCAKE có hỗ trợ cấu hình Webhook (để bắn thông báo về Vercel khi đơn được thanh toán) không? (Thông thường Pancake/Poscake có hỗ trợ Webhook/Trigger). Nếu không, tôi sẽ đổi chiến lược sang gọi API polling (quét) kiểm tra giao dịch mỗi 5 giây.

---

## Proposed Changes

### 1. Database (Supabase)
Thêm các cột sau vào bảng `preorders` để lưu trữ trạng thái thanh toán và thông tin kết nối với POSCAKE.

#### [MODIFY] [supabase-setup.sql](file:///e:/hai/TOOL%20AI%20CODE/LDP%20MathCA/supabase-setup.sql)
Thêm lệnh SQL để alter bảng `preorders`:
- Thêm cột `payment_method` (text, default 'COD').
- Thêm cột `payment_status` (text, default 'pending').
- Thêm cột `poscake_order_id` (text).

---

### 2. Giao diện người dùng (Frontend)

#### [MODIFY] [index.html](file:///e:/hai/TOOL%20AI%20CODE/LDP%20MathCA/index.html)
- **Thêm tùy chọn thanh toán**: Thêm 2 nút Radio (COD / Thanh toán Online - QR) vào form đặt hàng.
- **Xử lý hiển thị mã QR**:
  - Nếu khách chọn "COD": Xử lý như cũ, hiện popup "Thành công".
  - Nếu khách chọn "QR": Sau khi gọi API `preorder.js` thành công, ẩn form đi và hiện mã QR thanh toán động (sử dụng VietQR, số tiền = tổng bill, nội dung chuyển khoản theo yêu cầu của POSCAKE).
- **Lắng nghe Supabase Realtime**:
  - Sử dụng thư viện supabase-js (đã có trên web) để subscribe (đăng ký lắng nghe) thay đổi của đơn hàng vừa tạo.
  - Khi trạng thái `payment_status` thay đổi từ `pending` sang `paid`, tự động chuyển màn hình sang "Thanh toán thành công" và hiện dấu tick xanh.

---

### 3. Hệ thống Backend (API)

#### [MODIFY] [api/preorder.js](file:///e:/hai/TOOL%20AI%20CODE/LDP%20MathCA/api/preorder.js)
- Sửa lại câu truy vấn Supabase (`Prefer: 'return=representation'`) để nó trả về `id` của đơn hàng vừa tạo, thay vì không trả về gì.
- Lấy lựa chọn `paymentMethod` từ client gửi lên và lưu vào DB.
- Viết thêm hàm gọi API sang POSCAKE để **Tạo đơn hàng** (khi có khách đặt mới).
- Lưu lại `poscake_order_id` vừa tạo vào database.
- Trả về `id` (của hệ thống ta) và `poscake_order_id` cho Frontend để Frontend sinh mã QR.

#### [NEW] [api/poscake-webhook.js](file:///e:/hai/TOOL%20AI%20CODE/LDP%20MathCA/api/poscake-webhook.js)
- Tạo một file API mới để làm Webhook Listener.
- Đường dẫn sẽ là `https://<domain>/api/poscake-webhook`. Bạn sẽ dán đường dẫn này vào cài đặt Webhook của POSCAKE.
- Khi POSCAKE nhận được tiền -> khớp đơn -> đổi trạng thái đơn -> Gọi Webhook này.
- API này nhận data từ POSCAKE, trích xuất `poscake_order_id`, và cập nhật bản ghi trong Supabase thành `payment_status = 'paid'`. (Ngay khi Supabase được cập nhật, Frontend sẽ tự động nhận được thông báo qua Realtime).

---

## Verification Plan

### Manual Verification
1. Chọn mua sản phẩm và chọn phương thức COD -> đảm bảo luồng cũ vẫn chạy tốt.
2. Chọn mua sản phẩm và chọn phương thức QR -> đảm bảo API trả về thành công và hiện mã QR hợp lệ (có thể dùng app ngân hàng quét thử xem có ra đúng số tiền và nội dung không).
3. (Giả lập Webhook): Dùng Postman hoặc code gọi API vào endpoint `poscake-webhook` để báo đã thanh toán -> đảm bảo màn hình Frontend tự động nảy sang màn hình báo thành công.
