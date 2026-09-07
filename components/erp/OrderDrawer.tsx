import type { Order } from '@/types/erp';
import { money } from '@/lib/format';

export default function OrderDrawer({
  order,
  onClose,
  onToast,
}: {
  order: Order;
  onClose: () => void;
  onToast: (s: string) => void;
}) {
  return (
    <div className="drawer-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="drawer">
        <div className="drawer-head">
          <span><small>CHI TIẾT ĐƠN HÀNG</small><b>{order.id}</b></span>
          <button onClick={onClose}>×</button>
        </div>
        <div className="drawer-status">
          <i className={`badge ${order.tone}`}>{order.status}</i>
          <span>Tạo ngày {order.date}</span>
        </div>
        <section>
          <p>KHÁCH HÀNG</p>
          <h3>{order.customer}</h3>
          <span>{order.channel} · Hạn mức tín dụng còn 1,2 tỷ</span>
        </section>
        <section className="drawer-grid">
          <div><p>KHO XUẤT</p><b>{order.warehouse}</b></div>
          <div><p>GIAO DỰ KIẾN</p><b>26/08/2026</b></div>
          <div><p>NHÂN VIÊN SALE</p><b>Trần Minh Anh</b></div>
          <div><p>THANH TOÁN</p><b>Công nợ 15 ngày</b></div>
        </section>
        <section>
          <p>HÀNG HÓA</p>
          <div className="drawer-product">
            <span>01</span>
            <div>
              <b>Xăng RON 95-III</b>
              <small>{new Intl.NumberFormat('vi-VN').format(Math.round(order.value / 24600))} lít × 24.600 ₫</small>
            </div>
            <strong>{money(order.value)}</strong>
          </div>
        </section>
        <div className="drawer-total">
          <span>Tổng giá trị</span>
          <strong>{money(order.value)}</strong>
          <small>Đã bao gồm thuế, phí theo chính sách hiện hành</small>
        </div>
        <div className="drawer-actions">
          <button className="outline-button" onClick={() => onToast(`Đã xuất PDF ${order.id}`)}>⇩ Xuất PDF</button>
          <button
            className="primary-button large"
            onClick={() => {
              onToast(`Đã chuyển duyệt ${order.id}`);
              onClose();
            }}
          >
            Gửi phê duyệt
          </button>
        </div>
      </aside>
    </div>
  );
}