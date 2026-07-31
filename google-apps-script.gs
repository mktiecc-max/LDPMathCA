/**
 * GOOGLE APPS SCRIPT - Nhận đơn pre-order và ghi vào Google Sheet
 *
 * CÁCH CÀI ĐẶT:
 * 1. Tạo 1 Google Sheet mới (đặt tên VD: "MathCA Preorders")
 * 2. Vào menu: Tiện ích mở rộng (Extensions) > Apps Script
 * 3. Xóa code mặc định, dán toàn bộ file này vào
 * 4. Bấm "Triển khai" (Deploy) > "Tùy chọn triển khai mới" (New deployment)
 *    - Loại: Ứng dụng web (Web app)
 *    - Thực thi với tư cách (Execute as): Tôi (Me)
 *    - Ai có quyền truy cập (Who has access): Bất kỳ ai (Anyone)
 * 5. Copy "URL ứng dụng web" (dạng https://script.google.com/macros/s/XXXX/exec)
 * 6. Dán URL đó vào biến môi trường GOOGLE_SCRIPT_URL trên Vercel
 *
 * LƯU Ý: Mỗi lần sửa code phải Deploy > Manage deployments > Edit > New version
 */

var SHEET_NAME = 'Preorders';

var HEADERS = [
  'Thời gian', 'Họ tên', 'SĐT', 'Email', 'Lớp',
  'Số lượng', 'Tổng tiền', 'Địa chỉ', 'Ghi chú', 'Nguồn', 'Thiết bị'
];

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#EAF7F5');
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      new Date(),                 // giờ máy chủ Google (đặt múi giờ Sheet = GMT+7)
      data.name || '',
      "'" + (data.phone || ''),   // thêm ' để giữ số 0 đầu
      data.email || '',
      data.grade || '',
      data.qty || 1,
      data.total || '',
      data.address || '',
      data.note || '',
      data.source || '',
      data.userAgent || ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Hàm test nhanh trong editor: chạy testAppend rồi kiểm tra Sheet
function testAppend() {
  var fake = {
    postData: {
      contents: JSON.stringify({
        name: 'Test Phụ Huynh',
        phone: '0912345678',
        email: 'test@gmail.com',
        grade: 'Lớp 3',
        qty: 2,
        total: 478000,
        address: '123 Đường ABC, Quận 1, TP.HCM',
        note: 'Đơn test',
        source: 'test',
        userAgent: 'test'
      })
    }
  };
  Logger.log(doPost(fake).getContent());
}
