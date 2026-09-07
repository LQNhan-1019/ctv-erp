import type { Order } from '@/types/erp';
import OrderTable from './OrderTable';

export default function Sales({
  orders,
  status,
  setStatus,
  onOpen,
  onCreate,
}: {
  orders: Order[];
  status: string;
  setStatus: (s: string) => void;
  onOpen: (o: Order) => void;
  onCreate: () => void;
}) {
  return (
    <>
      <div className="section-heading">
        <div>
          <p>BÁN HÀNG & PHÂN PHỐI</p>
          <h1>Đơn bán hàng</h1>
          <span>Quản lý từ báo giá, đơn bán đến giao hàng và xuất hóa đơn.</span>
        </div>
        <button className="primary-button large" onClick={onCreate}>＋ Tạo đơn hàng</button>
      </div>

      <div className="mini-kpis">
        <article><span>ĐƠN TRONG THÁNG</span><b>286</b><small>↗ 18 đơn so với tháng trước</small></article>
        <article><span>GIÁ TRỊ</span><b>18,42 tỷ</b><small>78% kế hoạch</small></article>
        <article><span>CHỜ GIAO</span><b>24</b><small>8 đơn giao hôm nay</small></article>
        <article><span>QUÁ HẠN</span><b className="danger-text">3</b><small>Cần điều phối lại</small></article>
      </div>

      <section className="panel data-panel">
        <div className="table-toolbar">
          <div className="filter-tabs">
            {['Tất cả', 'Chờ duyệt', 'Đã xác nhận', 'Đang giao', 'Đã giao'].map((item) => (
              <button key={item} onClick={() => setStatus(item)} className={status === item ? 'active' : ''}>
                {item}
              </button>
            ))}
          </div>
          <button className="outline-button">⇩ Xuất dữ liệu</button>
        </div>
        <OrderTable orders={orders} onOpen={onOpen} full />
        {orders.length === 0 && (
          <div className="empty-state">
            <b>Không tìm thấy đơn hàng</b>
            <span>Thử từ khóa hoặc trạng thái khác.</span>
          </div>
        )}
      </section>
    </>
  );
}