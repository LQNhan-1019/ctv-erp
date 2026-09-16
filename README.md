# CTV ERP — Next.js frontend

Frontend quản trị CTV ERP, kết nối backend Spring Boot qua JWT, refresh cookie HttpOnly và CSRF cookie.

## Chạy trên máy

Yêu cầu Node.js 22 trở lên.

```bash
npm install
npm run dev
```

Sao chép `.env.example` thành `.env.local`, sau đó mở `http://localhost:3000`.

Khi deploy ở tên miền riêng, sao chép `.env.example` thành `.env.local` và đổi `NEXT_PUBLIC_SITE_URL` sang địa chỉ thật.

## Cây thư mục

- `app/`: route App Router (`/login`, `/accounts`, `/dashboard`).
- `features/auth/`: API, context, type và giao diện đăng nhập.
- `features/accounts/`: API, type và component quản lý tài khoản/role.
- `components/layout/`: shell điều hướng dùng chung cho trang quản trị.
- `components/ui/`: component giao diện nguyên tử như icon.
- `lib/api/`: HTTP client, Bearer token và CSRF.
- `lib/config/`: cấu hình môi trường tập trung.
- `types/`: kiểu dữ liệu dùng chung.
- `components/erp/`, `data/`: dashboard ERP demo hiện có.

## Backend yêu cầu

Backend mặc định chạy ở `http://localhost:8080` và phải cho phép CORS từ `http://localhost:3000`. Tài khoản đầu tiên được tạo bằng cơ chế bootstrap admin của backend.

Trang `/` chuyển thẳng đến `/accounts`. Nếu chưa có phiên refresh hợp lệ, frontend đưa người dùng về `/login`. Access token chỉ tồn tại trong bộ nhớ; refresh token do backend quản lý bằng cookie HttpOnly.
