import type { ModuleData } from '@/types/erp';

export default function ModulePage({ data }: { data: ModuleData }) {
  return (
    <>
      <div className="section-heading">
        <div>
          <p>{data.eyebrow}</p>
          <h1>{data.title}</h1>
          <span>{data.description}</span>
        </div>
        <button className="primary-button large">＋ Tạo mới</button>
      </div>
      <div className="module-kpis">
        {data.metrics.map((m) => (
          <article key={m.label}>
            <span>{m.label}</span>
            <b>{m.value}</b>
            <small>{m.note}</small>
          </article>
        ))}
      </div>
      <section className="panel module-activity">
        <div className="table-title">
          <div><h2>Hoạt động gần đây</h2><p>Các mục cần theo dõi trong hôm nay</p></div>
          <button className="outline-button">Xem báo cáo</button>
        </div>
        {data.activity.map((item, index) => (
          <button key={item}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <b>{item}</b>
            <em>›</em>
          </button>
        ))}
      </section>
    </>
  );
}