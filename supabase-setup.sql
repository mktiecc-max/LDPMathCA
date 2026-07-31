-- Chạy trong Supabase Dashboard > SQL Editor.
-- Tạo 2 bảng: đơn pre-order và nội dung landing page (do trang /admin quản lý).

-- 1) Đơn đặt trước
create table if not exists public.preorders (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  name        text not null,
  phone       text not null,
  email       text,
  grade       text,
  qty         integer not null default 1,
  total       integer,
  address     text not null,
  note        text,
  source      text,
  user_agent  text
);

-- 2) Nội dung + cài đặt landing page (luôn chỉ có đúng 1 dòng, id = 1)
create table if not exists public.site_content (
  id          integer primary key,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

-- Bật RLS và KHÔNG tạo policy cho anon: chỉ service_role key (dùng ở serverless
-- function phía server) mới đọc/ghi được — dữ liệu khách hàng và mật khẩu
-- không thể bị truy cập trực tiếp từ trình duyệt.
alter table public.preorders    enable row level security;
alter table public.site_content enable row level security;
