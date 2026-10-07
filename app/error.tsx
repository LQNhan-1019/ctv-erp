'use client';

import { RotateCcw, TriangleAlert } from 'lucide-react';
import { useEffect } from 'react';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="route-error" role="alert">
      <span aria-hidden="true"><TriangleAlert /></span>
      <p>KHÔNG THỂ TẢI TRANG</p>
      <h1>Đã có lỗi trong lúc hiển thị dữ liệu</h1>
      <div>Phiên đăng nhập và dữ liệu của bạn vẫn được giữ nguyên. Hãy thử tải lại phần nội dung này.</div>
      <button type="button" className="nova-button primary" onClick={reset}><RotateCcw />Thử lại</button>
    </main>
  );
}
