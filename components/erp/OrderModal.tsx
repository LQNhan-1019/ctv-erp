'use client';

import { FormEvent, useState } from 'react';
import { money } from '@/lib/format';

export default function OrderModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}) {
  const [product, setProduct] = useState('RON95-III');
  const [quantity, setQuantity] = useState(12000);
  const price = product === 'RON95-III' ? 24600 : product === 'DO-0.05S' ? 21800 : 23200;

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="order-modal" onSubmit={onSubmit}>
        <div className="modal-head">
          <div><p>ĐƠN BÁN HÀNG MỚI</p><h2>Tạo đơn hàng</h2></div>
          <button type="button" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <label>
            Khách hàng
            <select name="customer" required defaultValue="">
              <option value="" disabled>Chọn khách hàng</option>
              <option>CHXD Minh Phát</option>
              <option>CHXD Hoàng Gia</option>
              <option>Công ty Vận tải Đông Nam</option>
              <option>HTX Vận tải Hòa Bình</option>
            </select>
          </label>
          <div className="form-grid">
            <label>
              Kho xuất
              <select name="warehouse">
                <option>Kho Cát Lái</option>
                <option>Kho Nhà Bè</option>
                <option>Kho Đồng Nai</option>
              </select>
            </label>
            <label>
              Ngày giao
              <input type="date" defaultValue="2026-08-26" />
            </label>
          </div>
          <div className="line-item">
            <div className="line-title"><b>Sản phẩm</b><span>01 dòng hàng</span></div>
            <div className="line-grid">
              <label>
                Mặt hàng
                <select name="product" value={product} onChange={(e) => setProduct(e.target.value)}>
                  <option value="RON95-III">Xăng RON 95-III</option>
                  <option value="E5-RON92">Xăng E5 RON 92-II</option>
                  <option value="DO-0.05S">Dầu DO 0,05S-II</option>
                </select>
              </label>
              <label>
                Số lượng (lít)
                <input
                  name="quantity"
                  type="number"
                  min="1000"
                  step="1000"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </label>
            </div>
            <div className="price-line">
              <span>Đơn giá dự kiến <b>{new Intl.NumberFormat('vi-VN').format(price)} ₫/lít</b></span>
              <strong>{money(quantity * price)}</strong>
            </div>
          </div>
          <label>
            Ghi chú
            <textarea placeholder="Ghi chú giao hàng, điều khoản thanh toán..." />
          </label>
        </div>
        <div className="modal-foot">
          <button type="button" className="outline-button" onClick={onClose}>Hủy</button>
          <button className="primary-button large" type="submit">Tạo và gửi duyệt</button>
        </div>
      </form>
    </div>
  );
}