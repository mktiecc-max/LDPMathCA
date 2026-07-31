# Báo cáo rà soát code — Landing Page MathCA (Sổ Tay Thiên Tài Toán)

Ngày rà soát: 31/07/2026 · Nhánh `main` · Commit `bda1c34`

Phạm vi: `index.html` (1.400 dòng), `admin/index.html` (757 dòng), `api/*` (4 file), `lib/*` (3 file),
`vercel.json`, `supabase-setup.sql`, `google-apps-script.gs`.

---

## 0. Tóm tắt điều hành

| Hạng mục | Đánh giá | Ghi chú |
|---|---|---|
| Kiến trúc tổng thể | 🟢 Tốt | Static HTML + serverless, không build step, chống hỏng tốt (fallback nội dung tĩnh) |
| Bảo mật server | 🟡 Trung bình | 1 lỗ hổng thật (giá do client quyết định), thiếu rate-limit |
| Đúng đắn chức năng | 🔴 Cần sửa | 8 lỗi thật, trong đó 3 lỗi khách hàng nhìn thấy trực tiếp |
| Code thừa / chết | 🔴 Nhiều | ~22% CSS chết, 1 tính năng chết hoàn toàn, 3 mục CMS sửa vô ích |
| Hiệu suất | 🟡 Trung bình | 5 ảnh lớn tải ngay, 2 animation vô hạn, analytics nạp chậm |
| SEO | 🔴 Yếu | Thiếu canonical, JSON-LD, favicon, og:url, robots.txt |
| Bố cục chuyển đổi | 🟡 Trung bình | Thiếu hẳn phần bằng chứng xã hội, bảng giá nằm quá sâu |

**Ưu tiên nếu chỉ làm được 3 việc:** ① sửa lỗ hổng giá ở `api/preorder.js` → ② sửa 3 lỗi hiển thị ở hero
→ ③ tối ưu ảnh hero + nạp analytics sớm.

---

## 1. Điểm đang làm tốt (giữ nguyên, đừng sửa)

Cần ghi nhận trước, vì đây là những quyết định thiết kế đúng và không nên phá:

1. **Thiết kế chống hỏng (graceful degradation).** Landing page có nội dung tĩnh đầy đủ trong HTML;
   nếu `/api/content` hoặc Supabase chết, trang vẫn hiển thị nguyên vẹn thay vì trắng màn hình.
   Đây là điểm mạnh nhất của codebase.
2. **`mergeContent()` đệ quy** (`lib/content.js:168`) — thêm field mới về sau không làm vỡ dữ liệu đã lưu.
3. **Không có build step, không framework.** Với một landing page bán hàng, đây là lựa chọn đúng:
   thời gian tải nhanh, không có node_modules, deploy tức thì.
4. **RLS bật trên cả 2 bảng Supabase, không có policy cho `anon`** — trình duyệt khách không thể
   đọc dữ liệu đơn hàng. Đúng chuẩn.
5. **Token HMAC không lưu session ở server** (`lib/auth.js`) — hợp với môi trường serverless.
6. **Đơn hàng ghi song song Supabase + Google Sheet với `Promise.allSettled`** — một bên chết vẫn không mất đơn.
7. **SCHEMA-driven CMS** (`admin/index.html:132`) — thêm 1 dòng vào SCHEMA là tự sinh ô nhập liệu.
   Kiến trúc admin rất gọn cho quy mô này.

---

## 2. LỖI THẬT — phải sửa

### 🔴 P0-1. Khách hàng có thể tự đặt giá đơn hàng

**File:** `api/preorder.js:46`

```js
total: reqTotal ? parseInt(reqTotal, 10) : (cleanQty * unitPrice),
```

Server nhận `total` từ body request và ghi thẳng vào database. Bất kỳ ai mở DevTools cũng có thể
gửi `total: 1000` và đơn hàng sẽ được lưu với giá 1.000đ, đồng thời Facebook Pixel `Purchase` cũng
bắn sai giá trị → làm hỏng cả dữ liệu tối ưu quảng cáo.

**Cách sửa:** tính giá ở server từ `content.form.packages`, không tin client.

```js
// Thay khối tính total bằng:
const packages = (content.form && content.form.packages) || [];
const chosen = packages.find(p => p.name === pkgName) || packages[0];
const serverTotal = chosen ? Number(chosen.new) || 0 : cleanQty * unitPrice;
// ...
total: serverTotal,
```

### 🔴 P0-2. Honeypot chống bot chỉ chạy ở client

**File:** `index.html:909` (client có check) · `api/preorder.js` (server **không** check)

```js
if (form.elements['website'].value) return; // honeypot — chỉ ở client
```

Bot gửi POST thẳng vào `/api/preorder` bỏ qua hoàn toàn lớp chặn này. Kết hợp với việc không có
rate-limit, endpoint này có thể bị spam hàng nghìn đơn rác vào Sheet và Supabase.

**Cách sửa:** ở `api/preorder.js`, sau khi đọc body:

```js
if (req.body && req.body.website) {
  return res.status(200).json({ ok: true }); // giả vờ thành công, không ghi gì
}
```

Cộng thêm chặn tần suất đơn giản theo số điện thoại (xem mục 6.2).

### 🔴 P0-3. Dòng ghi chú dưới nút CTA hero bị lặp chữ

**File:** `index.html:394` + `lib/content.js:35`

HTML tĩnh:
```html
<span data-cms="hero.note">Miễn phí vận chuyển toàn quốc.</span> Còn lại <b>200</b>/<span>200</span> suất
```
Nội dung CMS:
```js
note: 'Miễn phí vận chuyển toàn quốc · Không cần đăng nhập · Còn {stockLeft}/{stockTotal} suất'
```

Sau khi `/api/content` trả về, đoạn `{stockLeft}/{stockTotal}` được chèn vào span **và** phần
"Còn lại 200/200 suất" viết cứng vẫn còn nguyên. Kết quả khách nhìn thấy:

> Miễn phí vận chuyển toàn quốc · Không cần đăng nhập · Còn 200/200 suất **Còn lại 200/200 suất**

**Cách sửa:** bỏ phần viết cứng ngoài span, để CMS lo toàn bộ dòng — nhưng khi đó `#stockRemainingCount`
(dùng cho popup đơn ảo) mất chỗ bám. Xem P0-4 để xử lý một lượt.

### 🔴 P0-4. Ba nguồn "số suất còn lại" mâu thuẫn nhau

Hiện có **ba** con số tồn kho chạy song song, không đồng bộ:

| Nguồn | Giá trị mặc định | Ảnh hưởng tới |
|---|---|---|
| `settings.stockLeft` (`lib/content.js:17`) | 200 | Thanh tiến trình `#stockFill`, biến `{stockLeft}` |
| `notify.initialStock` (`index.html:1336`) | 142 (viết cứng trong JS) | Số ở `#stockRemainingCount` dưới nút CTA |
| HTML tĩnh (`index.html:394`) | 200 | Hiển thị trước khi API trả về |

Khách mở trang thấy "200", vài trăm mili giây sau nhảy về "142", trong khi thanh tiến trình vẫn
đầy 100%. Vừa nhấp nháy vừa mâu thuẫn logic — trực tiếp phá cảm giác khan hiếm mà tính năng này
được tạo ra để tạo.

**Cách sửa:** chỉ giữ **một** nguồn duy nhất là `settings.stockLeft`. Popup đơn ảo giảm dần từ
chính con số đó, và cập nhật luôn `#stockFill` mỗi lần giảm. Xóa `notify.initialStock` khỏi
SCHEMA admin (`admin/index.html:198`).

### 🟠 P1-5. Tính năng "tự mở popup khi cuộn" đã chết hoàn toàn

**File:** `index.html:1371-1387`

```js
var specsSec = document.getElementById('specsSection');
if (!specsSec || !('IntersectionObserver' in window)) return;
```

`#specsSection` **không tồn tại** trong HTML (đã bị xóa trong lần refactor trước). Toàn bộ 17 dòng
code này không bao giờ chạy. Đây là một tính năng tăng chuyển đổi đang bị mất.

**Chọn 1 trong 2:** hoặc xóa hẳn 17 dòng, hoặc trỏ observer sang `#pricingSection` (đang tồn tại)
để khôi phục tính năng. Tôi khuyến nghị khôi phục nhưng đổi ngưỡng: chỉ mở popup khi khách đã ở
trên trang > 15 giây **và** cuộn qua bảng giá — mở quá sớm gây khó chịu và tăng bounce.

### 🟠 P1-6. Dữ liệu đổ sai cột trong Google Sheet

**File:** `index.html:920-921`

```js
grade: pkgText,     // ← tên gói, không phải lớp
package: pkgText,   // ← lặp lại chính nó
```

Cột **"Lớp"** trong Google Sheet đang chứa tên gói ("Mua lẻ 1 cuốn (Ưu đãi 25%)"). Đồng thời
`api/preorder.js:48` lại nhét tên gói **lần nữa** vào cột Ghi chú (`[Gói: ...]`). Kết quả: dữ liệu
gói bị ghi 2 lần, còn thông tin lớp của con — thứ đội bán hàng thực sự cần để tư vấn — bị mất trắng.

Đáng chú ý: `form.grades` (danh sách 6 lớp) vẫn nằm nguyên trong `lib/content.js:157` nhưng form
đã không còn ô chọn lớp. **Cách sửa:** thêm lại ô chọn lớp vào form (xem mục 5.3) và trả `grade`
về đúng nghĩa.

### 🟠 P1-7. Ghi chú "Khóa MathCA Online là một phần của Sổ" bị nhân đôi trong DOM

**File:** `index.html:359-362` (desktop) và `index.html:382-385` (mobile)

Cùng một đoạn văn bản xuất hiện 2 lần, ẩn/hiện bằng `.desktop-only` / `.mobile-only`. Hai vấn đề:

1. Chỉ bản desktop có `id` (`heroNoticeTitle`, `heroNoticeText`) nên **sửa trong CMS chỉ đổi được
   bản desktop** — trên điện thoại khách vẫn thấy nội dung cũ. Vì phần lớn traffic quảng cáo là
   mobile, đây là lỗi ảnh hưởng đúng nhóm khách hàng chính.
2. Google nhìn thấy nội dung trùng lặp trong cùng một trang.

**Cách sửa:** giữ **một** khối duy nhất, dùng CSS `order` trong flex/grid để đổi vị trí giữa mobile
và desktop thay vì nhân đôi HTML.

### 🟡 P2-8. Popup đơn ảo có thể làm form đặt hàng crash

**File:** `index.html:1132-1133` + `index.html:913`

```js
c.form.packages.forEach(function (pkg) {
  if (!pkg.id) return;   // ← gói thiếu ID bị bỏ qua, nhưng select đã bị xóa sạch trước đó
```

Nếu admin thêm một gói mới trong CMS mà quên điền ID, `<select>` đã bị `innerHTML = ''` nhưng không
có option nào được thêm vào → `packageSelect.selectedIndex` = -1 →
`packageSelect.options[-1].text` ném `TypeError` khi khách bấm gửi đơn. **Khách không đặt được hàng
và không thấy thông báo lỗi gì.**

**Cách sửa:** thêm guard trước khi submit:

```js
var selOpt = packageSelect.options[packageSelect.selectedIndex];
var pkgText = selOpt ? selOpt.text : (pkg.name || 'Gói mặc định');
```

Đồng thời đặt `id` là trường bắt buộc trong admin (tự sinh nếu để trống).

### 🟡 P2-9. Ảnh hero trong CMS bị lặp

**File:** `index.html:1039-1056`

Code giữ lại slide đầu tiên từ HTML tĩnh rồi append toàn bộ `hero.carouselImages` vào sau. Nếu
admin thêm chính ảnh bìa vào danh sách slider (phản xạ tự nhiên vì danh sách trông như "danh sách
đầy đủ"), ảnh bìa sẽ xuất hiện 2 lần. Nên đổi thành: **CMS quyết định toàn bộ danh sách**, không
giữ lại slide tĩnh.

### 🟡 P2-10. Phím Esc đóng cả lightbox lẫn popup cùng lúc

**File:** `index.html:801` và `index.html:840`

Hai listener `keydown` độc lập, listener của modal gọi `closeModal()` **vô điều kiện**. Khi khách
đang xem ảnh phóng to trong lightbox và bấm Esc, cả lightbox lẫn form đặt hàng cùng đóng — khách
mất hết dữ liệu đã điền. **Cách sửa:** gộp thành một listener, xử lý theo thứ tự ưu tiên
(lightbox trước, modal sau, dùng `return` sau mỗi nhánh).

---

## 3. Code thừa / code chết — xóa được ngay

Tổng cộng có thể xóa an toàn khoảng **~5,5 KB** (chưa nén) khỏi `index.html`, tức ~22% khối CSS.

### 3.1. CSS không có HTML tương ứng

Đã kiểm chứng bằng cách đối chiếu từng class với toàn bộ HTML và JS sinh DOM:

| Vùng CSS | Dòng | Lý do chết |
|---|---|---|
| `.online`, `.online-desc`, `.online-flow-label`, `.online-flow-title` | 120-126 | Section "MathCA Online" đã bị xóa khỏi HTML |
| `.flow-grid`, `.flow-card`, `.flow-card .flow-icon`, `.flow-card h4/p` | 127-131 | Cùng section đã xóa |
| `.flow-grid` trong media query desktop | 305 | Cùng section đã xóa |
| `.online h2`, `.online-flow-title` desktop | 306-307 | Cùng section đã xóa |
| `.qty-row`, `.qty-btn`, `.qty-row input` | 252-255 | Ô tăng/giảm số lượng đã bị bỏ khỏi form |
| `.form-row-inline` (cả bản desktop) | 251, 327 | Hàng "Lớp + Số lượng" đã bị bỏ |
| `.benefit-item` + `.benefit-list` desktop override | 303 | `grid-template-columns:1fr` trùng với mặc định, không có tác dụng |

### 3.2. Mục CMS sửa xong không hiện ở đâu

Đây là loại code thừa nguy hiểm nhất: người quản trị bỏ công sửa mà không thấy kết quả, dẫn tới
mất niềm tin vào CMS.

| Mục trong `/admin` | Định nghĩa tại | Vấn đề |
|---|---|---|
| **🔥 Ưu đãi nhắc lại** (`offer.*`) | `admin/index.html:258-265`, `lib/content.js:100-104` | Section này **không tồn tại** trong `index.html`. Sửa 3 field đều vô nghĩa |
| **📋 Thông số → Tiêu đề mục** (`specs.title`) | `admin/index.html:252` | Chỉ `specs.rows` được dùng (nhúng vào thẻ giá). `specs.title` không render ở đâu |
| `form.grades` | `lib/content.js:157` | Danh sách 6 lớp còn trong dữ liệu nhưng form đã bỏ ô chọn lớp |

**Xử lý:** xóa mục "Ưu đãi nhắc lại" khỏi SCHEMA và khỏi `DEFAULT_CONTENT`; xóa `specs.title`;
còn `form.grades` thì **giữ lại** vì cần cho việc khôi phục ô chọn lớp ở P1-6.

### 3.3. Chiều ngược lại: HTML có `data-cms` nhưng CMS không quản

| Binding | Dòng | Vấn đề |
|---|---|---|
| `data-cms="pricing.title"` | `index.html:467` | `pricing.*` không có trong `DEFAULT_CONTENT` lẫn SCHEMA → **tiêu đề bảng giá không sửa được từ /admin** |
| `data-cms="pricing.stockText"` | `index.html:468` | Tương tự. Tệ hơn: nếu sau này ai thêm `pricing.stockText` vào CMS, `innerHTML` sẽ **xóa mất** 3 span con `#stockLeftLabel`, `#stockTotalLabel`, `#maxQtyLabel2` bên trong |
| `#stockLeftLabel`, `#stockTotalLabel`, `#maxQtyLabel2` | `index.html:468` | Ba `id` này **không có code nào gán giá trị** — vĩnh viễn hiển thị 200/200/20 dù CMS đổi giá trị khác |

**Xử lý:** thêm mục `pricing` vào SCHEMA + `DEFAULT_CONTENT`, và gán giá trị cho 3 span trong
`applyContent()`. Đây là lỗi "im lặng": trang trông vẫn đúng khi tồn kho = 200, chỉ sai khi admin
đổi số.

### 3.4. File rác trong repo

**`footer mathca.txt`** (5.947 byte) — một đoạn HTML Tailwind của website MathCA khác, không được
file nào tham chiếu. Vì Vercel phục vụ toàn bộ file tĩnh ở thư mục gốc, file này **đang được public
tại `https://<site>/footer%20mathca.txt`**. Không chứa bí mật, nhưng là rác và lộ cấu trúc site khác.
→ Xóa.

---

## 4. Tối ưu hiệu suất

### 4.1. Ảnh — hạng mục có tác động lớn nhất

Trang hiện có **20 thẻ `<img>`** cho **14 URL ảnh duy nhất**, tất cả tải trực tiếp từ Supabase Storage
ở kích thước gốc.

**Vấn đề a — 5 ảnh hero tải ngay lập tức, chỉ 1 ảnh được nhìn thấy.**
`index.html:366-381`: slider mobile có 5 `<img>` và carousel desktop có thêm 5 `<img>` nữa (cùng URL
nên trình duyệt chỉ tải 5 lần, nhưng cả 5 đều tải **ngay**, không lazy). Khách chỉ nhìn thấy ảnh
đầu tiên. Bốn ảnh còn lại cạnh tranh băng thông trực tiếp với LCP.

```html
<!-- Ảnh 1: giữ nguyên, thêm ưu tiên -->
<img src="..." fetchpriority="high" width="800" height="600" alt="...">
<!-- Ảnh 2-5: thêm lazy -->
<img src="..." loading="lazy" decoding="async" width="800" height="600" alt="...">
```

**Vấn đề b — không có `preconnect` tới Supabase Storage.** Mọi ảnh đều nằm ở
`rwtpwdyoxirfpposmdcg.supabase.co`, một domain khác. Trình duyệt phải làm DNS + TLS handshake trước
khi tải ảnh đầu tiên — mất khoảng 100-300ms trên mạng 4G.

```html
<!-- Thêm vào <head>, ngay sau <meta viewport> -->
<link rel="preconnect" href="https://rwtpwdyoxirfpposmdcg.supabase.co" crossorigin>
<link rel="preload" as="image" fetchpriority="high"
      href="https://rwtpwdyoxirfpposmdcg.supabase.co/.../1-cover-hero-8960b400014c.webp">
```

**Vấn đề c — ảnh phục vụ ở kích thước gốc.** Ảnh bìa hiển thị tối đa 420px nhưng đang tải file gốc
(có thể 1200px+). Supabase Storage hỗ trợ biến đổi ảnh qua endpoint `render/image` (cần gói Pro):

```
/storage/v1/render/image/public/mathcaweb/...webp?width=840&quality=75
```

Nếu đang dùng gói Free, giải pháp thay thế: upload sẵn 2 phiên bản (`-800w.webp`, `-1600w.webp`) rồi
dùng `srcset`. Nên kiểm tra kích thước thật của các file hiện tại trước khi quyết định.

**Vấn đề d — thiếu `width`/`height` trên mọi ảnh** → gây CLS (layout shift). Phần lớn đã được che
bằng `aspect-ratio` trong CSS (tốt), nhưng logo header (`height:36px`, không width) và logo footer
(`height:48px`, không width) vẫn gây giật nhẹ khi tải.

### 4.2. Hai animation vô hạn chạy suốt vòng đời trang

**File:** `index.html:77-78`

```css
@keyframes ctaPulse{ ... box-shadow: 0 8px 30px rgba(...), 0 0 20px rgba(...) ... }
@keyframes ctaShine{0%{left:-60%;}100%{left:120%;}}
```

`ctaPulse` animate **`box-shadow`** và `ctaShine` animate **`left`** — cả hai đều là thuộc tính buộc
trình duyệt **repaint** (và `left` còn gây **reflow**) ở mỗi frame, 60 lần/giây, **vĩnh viễn**, trên
**3 nút** cùng lúc (`.header-cta`, `.cta-primary` × 2). Trên điện thoại tầm trung, đây là nguyên nhân
hao pin và giật khi cuộn rõ rệt nhất của trang.

**Cách sửa** — chuyển sang thuộc tính chỉ cần compositor (`transform`/`opacity`), dùng pseudo-element
cho hiệu ứng glow:

```css
.cta-primary::before{
  content:'';position:absolute;inset:0;border-radius:inherit;
  box-shadow:0 8px 30px rgba(255,90,54,.55);opacity:0;
  animation:ctaGlow 2s ease-in-out infinite;
}
@keyframes ctaGlow{0%,100%{opacity:0}50%{opacity:1}}
.cta-primary::after{ /* shine */ transform:translateX(-160%); animation:ctaShine 3s ease-in-out infinite; }
@keyframes ctaShine{to{transform:translateX(400%)}}
```

Đồng thời **tôn trọng người dùng tắt hiệu ứng** (bắt buộc về mặt accessibility):

```css
@media (prefers-reduced-motion: reduce){
  *{animation-duration:.01ms !important;animation-iteration-count:1 !important;}
}
```

### 4.3. Analytics nạp quá muộn

**File:** `index.html:1330` — `loadAnalytics(s)` chỉ được gọi **bên trong** `applyContent()`, tức là
sau khi `/api/content` trả về. Hệ quả:

- `PageView` của Facebook Pixel bị trễ 200-800ms so với lúc trang mở.
- Nếu `/api/content` lỗi hoặc chậm, **toàn bộ tracking không chạy** — mất dữ liệu tối ưu quảng cáo
  đúng lúc đang đốt tiền ads.

**Cách sửa:** viết cứng Pixel ID / GA4 ID vào một biến ở đầu `<script>` (hoặc tốt hơn: chèn thẳng
thẻ script vào `<head>`), giữ `loadAnalytics()` từ CMS chỉ như cơ chế dự phòng cho trường hợp đổi ID
mà chưa kịp deploy. Với landing page chạy ads, tracking phải là thứ chắc chắn nhất trên trang.

### 4.4. Popup đơn ảo chạy cả khi khách rời tab

**File:** `index.html:1344` — `setInterval(..., 10000)` không bao giờ bị `clearInterval`, chạy mãi
kể cả khi tab bị ẩn.

```js
var timer = setInterval(function(){
  if (document.hidden) return;      // ← thêm dòng này
  ...
}, 10000);
```

### 4.5. CMS ghi đè DOM gây nhấp nháy

`renderLists()` xóa sạch (`innerHTML=''`) rồi dựng lại gallery, FAQ, steps, footer... **kể cả khi nội
dung y hệt bản tĩnh**. Khách nhìn thấy trang vẽ 2 lần. Cải thiện: so sánh trước khi ghi, hoặc gói
việc cập nhật trong `requestAnimationFrame`. Đây là tối ưu "nice to have", không cấp bách.

### 4.6. Thiếu header cache cho file tĩnh

`vercel.json` mới chỉ đặt `no-store` cho `/api/*`. Nên thêm cho HTML:

```json
{ "source": "/", "headers": [
  { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }
]}
```

---

## 5. Bố cục lại phần tử

### 5.1. Thứ tự section — bảng giá đang nằm quá sâu

**Hiện tại:** Header → Hero → Vấn đề → Lợi ích → Thư viện ảnh → 3 Bước → **Bảng giá** → FAQ → CTA cuối → Footer

Khách từ quảng cáo phải cuộn qua **5 section** mới thấy giá và các gói. Với traffic ads (chủ yếu là
mobile, kiên nhẫn thấp), phần lớn rơi rụng trước khi tới đó.

**Đề xuất:** Header → Hero → Vấn đề → Lợi ích → **Thư viện ảnh** → **Bảng giá** → 3 Bước →
**⭐ Bằng chứng xã hội (mới)** → FAQ → CTA cuối → Footer

Lý do đưa Thư viện ảnh lên ngay trước Bảng giá: khách nhìn thấy sản phẩm thật → tin tưởng → gặp
ngay giá và nút mua. Đây là chuỗi tâm lý chuẩn cho sản phẩm vật lý.

### 5.2. Thiếu hẳn phần bằng chứng xã hội

Trang **không có** một dòng đánh giá, ảnh phụ huynh, con số học viên, hay logo trường/đối tác nào.
Với sản phẩm giáo dục bán cho phụ huynh — nhóm mua bằng sự an tâm chứ không bằng tính năng — đây là
thiếu sót lớn nhất về mặt chuyển đổi trong toàn bộ trang.

**Đề xuất thêm một section mới, đặt sau "3 Bước":**
- 3-4 đánh giá của phụ huynh (tên + lớp của con + ảnh, có thể là ảnh chụp tin nhắn Zalo)
- Một dải số liệu: số học viên, số trường đang dùng, điểm đánh giá trung bình
- Thêm mục `testimonials` vào SCHEMA để admin tự sửa

### 5.3. Form đặt hàng — 3 chỉnh sửa

| Vấn đề | Vị trí | Đề xuất |
|---|---|---|
| Ô Email đang `display:none` nhưng vẫn nằm trong DOM và vẫn được validate | `index.html:582-586` | Xóa hẳn khỏi HTML, hoặc bật lại — đang ở trạng thái lấp lửng |
| Mất ô chọn lớp của con | — | Thêm lại (dữ liệu `form.grades` vẫn còn sẵn). Đây là thông tin đội sale cần để tư vấn |
| Popup không khóa focus (focus trap) | `index.html:557` | Khi popup mở, phím Tab vẫn đi ra được các phần tử phía sau. Ảnh hưởng accessibility và người dùng bàn phím |

### 5.4. Thanh CTA cố định che nội dung cuối trang

**File:** `index.html:230` — `.sticky-cta` có `position:fixed;bottom:0` cao khoảng 60px, nhưng `body`
**không có `padding-bottom`**. Trên mobile, thanh này che mất phần cuối footer (dòng bản quyền và
link pháp lý).

```css
@media(max-width:899px){ body{padding-bottom:72px;} }
```

### 5.5. Popup đơn ảo chồng lên thanh CTA trên mobile

**File:** `index.html:100` — toast đặt `bottom:16px` trên mobile, đúng vị trí thanh sticky CTA đang
đứng. Hai phần tử đè lên nhau, che mất nút mua hàng — tức là tính năng tạo khan hiếm đang **chặn
đường** hành động mua.

```css
@media(max-width:600px){ .toast-notification{ bottom:80px; } }
```

### 5.6. Hero trên desktop

Bố cục grid 2 cột hiện tại (`text`/`cta` trái, `img` phải sticky) là hợp lý. Hai điều chỉnh nhỏ:
- Khối `.hero-badge-row` chứa badge + đồng hồ đếm ngược đang khá nặng thị giác ngay trên H1. Cân nhắc
  chuyển đồng hồ xuống ngay **trên nút CTA** — nơi nó tạo áp lực hành động đúng lúc.
- `.hero-img-wrap` có `position:sticky;top:90px` nhưng nằm trong grid có `align-items:flex-start` —
  nếu cột trái ngắn hơn cột phải, sticky không có khoảng để hoạt động. Kiểm tra lại trên màn 1440px.

---

## 6. Bảo mật & dữ liệu

### 6.1. `/api/login` không chặn dò mật khẩu

**File:** `api/login.js:17` — chỉ có `setTimeout(400ms)`. Kẻ tấn công chạy 100 request song song vẫn
thử được ~250 mật khẩu/giây. Nên thêm đếm số lần sai theo IP (lưu tạm trong Supabase hoặc dùng
Vercel KV), khóa 15 phút sau 5 lần sai.

### 6.2. `/api/preorder` không giới hạn tần suất

Không có giới hạn nào. Kết hợp với P0-2 (honeypot chỉ ở client), một script đơn giản có thể bơm
hàng nghìn đơn rác, làm cạn quota Google Apps Script (giới hạn ~20.000 lần gọi/ngày) và làm ngập
Supabase. Tối thiểu: chặn cùng một số điện thoại gửi quá 3 đơn trong 10 phút.

### 6.3. Rò rỉ độ dài mật khẩu qua timing

**File:** `lib/auth.js:27` — `if (a.length !== b.length) return false;` trả về **trước** khi so sánh
chống timing attack, để lộ độ dài mật khẩu quản trị. Rủi ro thấp nhưng sửa dễ: hash cả hai bằng
SHA-256 rồi `timingSafeEqual` trên hai digest luôn dài bằng nhau.

### 6.4. CMS có thể chèn link `javascript:`

**File:** `index.html:1237, 1272` — `a.href = item.url` không lọc scheme. Người có quyền admin có thể
lưu `javascript:...` vào link footer. Rủi ro thấp (đã cần quyền admin), nhưng nên chặn:

```js
function safeUrl(u){ return /^(https?:|\/|#|mailto:|tel:)/i.test(u||'') ? u : '#'; }
```

### 6.5. `/api/content` POST không giới hạn kích thước

Không kiểm tra độ lớn payload trước khi ghi vào Supabase. Nên chặn ở ~256KB.

---

## 7. SEO & chia sẻ — đang thiếu nhiều

| Thiếu | Ảnh hưởng |
|---|---|
| `<link rel="canonical">` | Nguy cơ trùng lặp nội dung khi có tham số UTM từ quảng cáo |
| JSON-LD `Product` + `Offer` + `FAQPage` | Mất rich snippet (giá, sao, câu hỏi) trên kết quả Google — tác động lớn với trang bán hàng |
| `<link rel="icon">` | Không có favicon, tab trình duyệt hiển thị icon trống |
| `og:url`, `og:locale`, `og:site_name` | Preview khi chia sẻ Facebook/Zalo không đầy đủ |
| `twitter:card` | Không có preview trên X/Twitter |
| `robots.txt`, `sitemap.xml` | Không có chỉ dẫn cho bot |
| Thẻ `<h2>` cho section title | Có dùng `.section-title` là `<h2>` ✓ nhưng `.benefit-group-title` là `<div>` — nên là `<h3>` |

Riêng JSON-LD nên ưu tiên vì trang đã có sẵn đầy đủ dữ liệu (giá, giá gốc, FAQ) — chỉ cần xuất
thêm một khối `<script type="application/ld+json">` sinh từ chính `CONFIG` và `c.faq.items`.

---

## 8. Lộ trình thực thi đề xuất

### Đợt 1 — Sửa lỗi (1-2 giờ, tác động ngay tới doanh thu)
1. `api/preorder.js`: tính `total` ở server + check honeypot *(P0-1, P0-2)*
2. `index.html`: gộp một nguồn tồn kho duy nhất, bỏ chữ lặp ở hero note *(P0-3, P0-4)*
3. `index.html`: guard `selectedIndex = -1` trước khi submit *(P2-8)*
4. `index.html`: gộp listener Esc *(P2-10)*

### Đợt 2 — Hiệu suất (1-2 giờ, cải thiện LCP & pin)
5. Thêm `preconnect` + `preload` ảnh hero, `fetchpriority="high"` *(4.1b)*
6. `loading="lazy"` cho 4 ảnh hero còn lại, thêm `width`/`height` cho logo *(4.1a, 4.1d)*
7. Đổi animation CTA sang `transform`/`opacity` + `prefers-reduced-motion` *(4.2)*
8. Chuyển analytics ra khỏi callback của `/api/content` *(4.3)*
9. Thêm `if (document.hidden) return` cho popup đơn ảo *(4.4)*

### Đợt 3 — Dọn dẹp (1 giờ, không đổi giao diện)
10. Xóa ~5,5KB CSS chết *(3.1)*
11. Xóa mục "Ưu đãi nhắc lại" + `specs.title` khỏi CMS *(3.2)*
12. Thêm `pricing.*` vào CMS + gán giá trị cho 3 span mồ côi *(3.3)*
13. Xóa `footer mathca.txt` *(3.4)*
14. Gộp `hero-notice` mobile/desktop thành một *(P1-7)*
15. Quyết định số phận tính năng auto-popup *(P1-5)*

### Đợt 4 — Chuyển đổi & SEO (2-4 giờ, tác động dài hạn)
16. Thêm section bằng chứng xã hội + mục CMS tương ứng *(5.2)*
17. Đảo thứ tự: đưa bảng giá lên trước "3 Bước" *(5.1)*
18. Thêm lại ô chọn lớp, sửa dữ liệu cột Sheet *(P1-6, 5.3)*
19. `padding-bottom` cho body + đẩy toast lên trên sticky CTA *(5.4, 5.5)*
20. JSON-LD, canonical, favicon, og:url, robots.txt *(mục 7)*

### Đợt 5 — Bảo mật (1-2 giờ)
21. Rate-limit `/api/login` và `/api/preorder` *(6.1, 6.2)*
22. Hash trước `timingSafeEqual`, lọc URL, giới hạn payload *(6.3, 6.4, 6.5)*

---

## 9. Hai điểm cần bạn quyết định

**a) Popup "đơn hàng ảo".** Tính năng này hiển thị tên khách và số tồn kho không có thật. Về mặt kỹ
thuật nó hoạt động (sau khi sửa P0-4), nhưng cần lưu ý: đây là thông tin sai sự thật hiển thị cho
người tiêu dùng, có rủi ro pháp lý theo Luật Bảo vệ quyền lợi người tiêu dùng, và rủi ro uy tín nếu
phụ huynh phát hiện. Một phương án thay thế giữ được hiệu ứng khan hiếm mà không cần bịa: hiển thị
**số đơn thật** từ Supabase (`GET /api/orders` phiên bản công khai, chỉ trả về số đếm và tên viết
tắt). Nếu bạn vẫn muốn giữ nguyên bản hiện tại, tôi sẽ sửa lỗi kỹ thuật và để nguyên cơ chế.

**b) Ô chọn lớp.** Thêm lại một trường sẽ làm giảm nhẹ tỷ lệ điền form, nhưng cột "Lớp" trong Sheet
hiện đang chứa dữ liệu sai. Hai lựa chọn: (1) thêm lại ô chọn lớp, hoặc (2) bỏ hẳn cột "Lớp" khỏi
Sheet và Supabase. Cả hai đều tốt hơn hiện trạng.

---

*Báo cáo dựa trên đọc mã tĩnh toàn bộ codebase. Các con số về LCP/CLS là suy luận từ cấu trúc mã,
chưa đo bằng Lighthouse trên môi trường production — nên chạy đo trước và sau Đợt 2 để xác nhận
mức cải thiện thực tế.*
