// Nội dung mặc định của landing page.
// Khi Supabase chưa có dữ liệu, API trả về đúng object này (và cũng là nội dung
// tĩnh đang nằm sẵn trong index.html). Sau khi lưu ở trang /admin, dữ liệu trong
// Supabase sẽ ghi đè lên các mục tương ứng.

export const DEFAULT_CONTENT = {
  settings: {
    fbPixelId: '',
    ga4Id: '',
    googleScriptUrl: '',
    googleSheetUrl: '',
    deadline: '2026-08-16T23:59:59+07:00',
    unitPrice: 239000,
    oldPrice: 320000,
    maxQty: 20,
    stockTotal: 200,
    stockLeft: 200
  },
  seo: {
    title: 'Sổ Tay Thiên Tài Toán Lớp 1-5 | MathCA – Pre-order Ưu Đãi 25%',
    description: 'Sổ công thức & mẹo Toán lớp 1–5 tích hợp video QR và trọn bộ khóa học MathCA Online 5 năm. Pre-order 200 cuốn đầu tiên – giảm 25%, miễn phí vận chuyển toàn quốc.',
    ogImage: 'https://rwtpwdyoxirfpposmdcg.supabase.co/storage/v1/object/public/mathcaweb/storefront/products/mca-st-15/1-cover-hero-8960b400014c.webp'
  },
  header: {
    logo: 'https://rwtpwdyoxirfpposmdcg.supabase.co/storage/v1/object/public/mathcaweb/brand/logos/mathca-logo-horizontal.webp',
    ctaText: 'Đặt Trước Ngay'
  },
  hero: {
    badge: 'PRE-ORDER 200 CUỐN ĐẦU TIÊN',
    title: 'Mỗi Cuốn Sổ Tay – Mở Ra Một Thiên Tài Toán Học',
    sub: 'Sổ công thức & mẹo Toán lớp 1–5 tích hợp video QR và trọn bộ khóa học MathCA Online 5 năm. Con tự học chủ động, ba mẹ an tâm đồng hành.',
    countdownLabel: '⏰ Ưu đãi kết thúc sau',
    saveTag: 'Tiết kiệm 25%',
    ctaText: '⚡ Đặt Trước Ngay',
    note: 'Miễn phí vận chuyển toàn quốc · Không cần đăng nhập · Còn {stockLeft}/{stockTotal} suất',
    image: 'https://rwtpwdyoxirfpposmdcg.supabase.co/storage/v1/object/public/mathcaweb/storefront/products/mca-st-15/1-cover-hero-8960b400014c.webp',
    imageAlt: 'Sổ Tay Thiên Tài Toán Lớp 1-5',
    noticeTitle: 'Khóa MathCA Online theo Sổ Tay lớp 1–5 là một phần của Sổ',
    noticeText: 'Mã cào trong Sổ mở quyền học trong 60 tháng kể từ ngày kích hoạt. Khóa học không được tách giá và không được gọi là quà tặng.'
  },
  problem: {
    title: 'Con Học Trước Quên Sau? MathCA Có Giải Pháp',
    sub: 'Không cần lo lắng khi ba mẹ bận rộn không kèm được con học Toán mỗi ngày.',
    cards: [
      {
        title: '😟 Nỗi lo của ba mẹ',
        text: 'Con quên công thức cũ, sợ môn Toán, không có ai giảng lại đúng bài khi cần, ba mẹ không đủ thời gian kèm cặp mỗi tối.'
      },
      {
        title: '✅ Giải pháp từ MathCA',
        text: 'Một cuốn sổ tra cứu nhanh mọi công thức lớp 1–5, kèm video hướng dẫn đúng bài chỉ bằng một lần quét QR — con tự học, tự ôn mọi lúc.'
      }
    ]
  },
  benefits: {
    title: 'Bạn Nhận Được Gì',
    sub: 'Trọn bộ công cụ tự học Toán tiểu học trong một sản phẩm duy nhất',
    soTayTitle: '📒 Sổ Tay Thiên Tài Toán',
    soTayItems: [
      'Tra cứu công thức và mẹo Toán xuyên suốt lớp 1–5 trong một cuốn sổ',
      'Quét QR để xem video giáo viên MathCA giải thích đúng nội dung đang học',
      'Thiết kế để bàn tiện tra cứu, khổ A5 gọn nhẹ, 66 trang bền bỉ'
    ],
    onlineTitle: '🎓 Khóa MathCA Online (tặng kèm)',
    onlineItems: [
      'Kích hoạt Khóa MathCA Online theo Sổ Tay lớp 1–5 trong 5 năm',
      'Nhận bài luyện tập cập nhật qua MathCA Online và email',
      'Tham gia nhóm Zalo hỗ trợ trao đổi cùng phụ huynh'
    ]
  },
  gallery: {
    title: 'Xem Bên Trong Cuốn Sổ',
    sub: 'Nội dung minh họa sinh động, dễ hiểu cho từng độ tuổi',
    images: [
      { src: 'https://rwtpwdyoxirfpposmdcg.supabase.co/storage/v1/object/public/mathcaweb/storefront/products/mca-st-15/3-construction-side-aca7661db528.webp', alt: 'Thiết kế để bàn', wide: true },
      { src: 'https://rwtpwdyoxirfpposmdcg.supabase.co/storage/v1/object/public/mathcaweb/storefront/products/mca-st-15/5-inner-number-0-10-951e83306104.webp', alt: 'Trang nội dung số học', wide: false },
      { src: 'https://rwtpwdyoxirfpposmdcg.supabase.co/storage/v1/object/public/mathcaweb/storefront/products/mca-st-15/6-inner-geometry-study-0c60e82ee04a.webp', alt: 'Hình học', wide: false },
      { src: 'https://rwtpwdyoxirfpposmdcg.supabase.co/storage/v1/object/public/mathcaweb/storefront/products/mca-st-15/8-inner-qr-scan-fa036a1241c2.webp', alt: 'Quét QR xem video', wide: false },
      { src: 'https://rwtpwdyoxirfpposmdcg.supabase.co/storage/v1/object/public/mathcaweb/storefront/products/mca-st-15/9-inner-unit-table-62efff3070e8.webp', alt: 'Bảng đơn vị', wide: false }
    ]
  },
  how: {
    title: 'Chỉ 3 Bước Để Con Bắt Đầu Học',
    steps: [
      { title: 'Nhận Sổ Tay Tận Nhà', text: 'Đặt trước hôm nay, nhận sổ nhanh chóng với miễn phí vận chuyển toàn quốc.' },
      { title: 'Kích Hoạt Mã Trong Sổ', text: 'Đăng nhập và nhập mã cào để mở khóa MathCA Online theo đúng lớp của con.' },
      { title: 'Học Cùng Video Mỗi Ngày', text: 'Quét QR đúng bài, xem video, luyện tập và theo dõi tiến độ ngay trên điện thoại.' }
    ]
  },
  specs: {
    title: 'Thông Số Sản Phẩm',
    rows: [
      { label: 'Nội dung', value: 'Công thức và mẹo Toán lớp 1–5' },
      { label: 'Quy cách', value: 'Khổ A5, 66 trang, dạng để bàn' },
      { label: 'Học trực tuyến', value: 'Khóa MathCA Online theo Sổ Tay lớp 1–5' },
      { label: 'Thời hạn', value: '60 tháng (5 năm) từ ngày kích hoạt' },
      { label: 'Chính sách', value: 'Được kiểm tra trước khi nhận; không đổi trả, đơn trên sàn theo chính sách của sàn' }
    ]
  },
  offer: {
    title: 'Ưu Đãi Pre-order Có Hạn',
    stockText: 'Còn lại {stockLeft}/{stockTotal} suất — Tối đa {maxQty} cuốn/đơn',
    ctaText: '⚡ Đặt Trước Ngay'
  },
  faq: {
    title: 'Câu Hỏi Thường Gặp',
    items: [
      { q: 'Sổ tay dùng được trong bao lâu?', a: 'Khóa MathCA Online đi kèm có thời hạn 60 tháng (5 năm) kể từ ngày kích hoạt mã.' },
      { q: 'Có cần tài khoản để đặt hàng không?', a: 'Không cần. Bạn chỉ cần điền thông tin nhận hàng vào form đặt trước, MathCA sẽ liên hệ xác nhận đơn.' },
      { q: 'Chính sách đổi trả như thế nào?', a: 'Sản phẩm được kiểm tra trước khi nhận hàng; sau khi nhận sẽ không áp dụng đổi trả (đơn trên sàn theo chính sách riêng của sàn).' },
      { q: 'Sổ tay phù hợp cho lớp mấy?', a: 'Nội dung bao phủ trọn vẹn chương trình Toán từ lớp 1 đến lớp 5 trong cùng một cuốn.' }
    ]
  },
  finalCta: {
    title: 'Đừng Để Con Bỏ Lỡ Ưu Đãi 25%',
    sub: 'Chỉ áp dụng cho {stockTotal} suất pre-order đầu tiên — miễn phí vận chuyển toàn quốc',
    ctaText: '⚡ Đặt Trước Ngay – {price}'
  },
  footer: {
    text: '© 2026 MathCA. Sổ Tay Thiên Tài Toán Lớp 1–5.'
  },
  form: {
    title: '🛒 Đặt Trước Sổ Tay Thiên Tài Toán',
    sub: 'Điền thông tin bên dưới, MathCA sẽ gọi xác nhận đơn trong 24h. Thanh toán khi nhận hàng (COD).',
    submitText: '⚡ Xác Nhận Đặt Trước',
    note: '🔒 Thông tin của bạn được bảo mật, chỉ dùng để xử lý đơn hàng.',
    errorText: 'Có lỗi khi gửi đơn. Vui lòng thử lại hoặc liên hệ Zalo/Hotline của MathCA.',
    successTitle: 'Đặt trước thành công!',
    successText: 'Cảm ơn ba mẹ đã tin tưởng MathCA. Chúng tôi sẽ gọi điện xác nhận đơn hàng trong vòng 24h. Ba mẹ vui lòng để ý điện thoại nhé!',
    grades: ['Chuẩn bị vào lớp 1', 'Lớp 1', 'Lớp 2', 'Lớp 3', 'Lớp 4', 'Lớp 5']
  }
};

// Gộp dữ liệu đã lưu lên trên bản mặc định: field nào chưa từng được sửa
// vẫn lấy giá trị mặc định, tránh vỡ trang khi thêm field mới về sau.
export function mergeContent(base, override) {
  if (!override || typeof override !== 'object' || Array.isArray(override)) {
    return override === undefined ? base : override;
  }
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const key of Object.keys(override)) {
    const b = base ? base[key] : undefined;
    const o = override[key];
    out[key] = (b && typeof b === 'object' && !Array.isArray(b) && o && typeof o === 'object' && !Array.isArray(o))
      ? mergeContent(b, o)
      : o;
  }
  return out;
}
