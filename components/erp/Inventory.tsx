import { inventory } from '@/data/inventory';

export default function Inventory() {
  return (
    <>
      <div className="section-heading">
        <div>
          <p>KHO & HÀNG HÓA</p>
          <h1>Tồn kho hợp nhất</h1>
          <span>Số liệu khả dụng theo sản phẩm và điểm lưu trữ.</span>
        </div>
        <button className="outline-button">↻ Đồng bộ tồn kho</button>
      </div>

      <div className="warehouse-strip">
        {['Kho Cát Lái|98,4%', 'Kho Nhà Bè|76,2%', 'Kho Đồng Nai|68,8%', 'Kho Bình Dương|82,5%'].map((w, i) => {
          const [name, value] = w.split('|');
          return (
            <article key={name}>
              <div>
                <span className={`warehouse-icon tone-${i}`}>□</span>
                <span><b>{name}</b><small>Đang hoạt động</small></span>
              </div>
              <strong>{value}</strong>
              <i><span style={{ width: value }} /></i>
            </article>
          );
        })}
      </div>

      <section className="panel data-panel">
        <div className="table-title">
          <div><h2>Tồn theo sản phẩm</h2><p>Cập nhật lần cuối 08:41 hôm nay</p></div>
          <button className="outline-button">⚙ Bộ lọc</button>
        </div>
        <div className="inventory-table">
          <div className="inventory-row head">
            <span>SẢN PHẨM</span><span>TỒN THỰC TẾ</span><span>ĐÃ GIỮ</span><span>KHẢ DỤNG</span><span>NGÀY BÁN</span>
          </div>
          {inventory.map((item) => (
            <div className="inventory-row" key={item.sku}>
              <span><b>{item.name}</b><small>{item.sku}</small></span>
              <span>{item.stock} <small>{item.unit}</small></span>
              <span>{item.reserved} <small>{item.unit}</small></span>
              <strong>{item.available} <small>{item.unit}</small></strong>
              <span><i className={`stock-pill ${item.tone}`}>{item.days} ngày</i></span>
            </div>
          ))}
        </div>
      </section>

      <div className="inventory-insight">
        <span>!</span>
        <div>
          <b>Khuyến nghị bổ sung Dầu hỏa FO</b>
          <p>Mức tồn hiện tại chỉ đủ cho 5 ngày bán. Hệ thống đề xuất nhập thêm 120.000 lít cho Kho Cát Lái.</p>
        </div>
        <button>Tạo yêu cầu mua →</button>
      </div>
    </>
  );
}