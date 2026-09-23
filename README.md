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

## Deploy Cloudflare Pages

Frontend được xuất tĩnh vì toàn bộ API nghiệp vụ chạy tại Spring Boot. Cấu hình Cloudflare Pages:

- Build command: `npm run pages:build`
- Build output directory: `out`
- Root directory: thư mục chứa `package.json`
- Không dùng `@cloudflare/next-on-pages` hoặc lệnh `npx @cloudflare/next-on-pages`.

Khai báo hai biến cho cả Production và Preview trong **Settings → Environment variables**:

```ini
NEXT_PUBLIC_SITE_URL=https://ctv-erp.pages.dev
NEXT_PUBLIC_API_BASE_URL=https://ten-mien-backend-cua-ban
```

`NEXT_PUBLIC_API_BASE_URL` phải là HTTPS public của Spring Boot, không dùng `localhost` và không có khoảng trắng hoặc dấu `/` ở cuối. Backend phải cho phép chính xác origin của Pages trong `CORS_ALLOWED_ORIGINS` và bật `SECURE_COOKIE=true`.

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

Trang `/` chuyển thẳng đến `/home`. Nếu chưa có phiên refresh hợp lệ, frontend đưa người dùng về `/login`. Access token chỉ tồn tại trong bộ nhớ; refresh token do backend quản lý bằng cookie HttpOnly.
