export default function Loading() {
  return (
    <main className="route-state" aria-busy="true" aria-live="polite">
      <span className="sr-only">Đang tải nội dung…</span>
      <div className="route-state-heading" aria-hidden="true">
        <span />
        <strong />
      </div>
      <div className="route-state-metrics" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => <span key={index} />)}
      </div>
      <div className="route-state-panel" aria-hidden="true" />
    </main>
  );
}
