import type { Order } from '@/types/erp';
import { compactMoney } from '@/lib/format';

export default function OrderTable({
  orders,
  onOpen,
  full = false,
}: {
  orders: Order[];
  onOpen: (o: Order) => void;
  full?: boolean;
}) {
  return (
    <div className="order-table">
      <div className={`order-row table-head ${full ? 'full' : ''}`}>
        <span>MÃ ĐƠN</span>
        <span>KHÁCH HÀNG</span>
        {full && <span>KHO XUẤT</span>}
        <span>GIÁ TRỊ</span>
        <span>TRẠNG THÁI</span>
        <span />
      </div>
      {orders.map((order) => (
        <button className={`order-row ${full ? 'full' : ''}`} key={order.id} onClick={() => onOpen(order)}>
          <b>{order.id}</b>
          <span>
            <strong className="customer-name">{order.customer}</strong>
            {full && <small>{order.channel} · {order.date}</small>}
          </span>
          {full && <span>{order.warehouse}</span>}
          <strong>{compactMoney(order.value)}</strong>
          <span><i className={`badge ${order.tone}`}>{order.status}</i></span>
          <em>›</em>
        </button>
      ))}
    </div>
  );
}