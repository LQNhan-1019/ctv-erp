'use client';

import { useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export default function ExactValue({ exact, children }: { exact: string; children: ReactNode }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const open = () => {
    const bounds = trigger.current?.getBoundingClientRect();
    if (bounds) setPosition({ left: Math.max(12, Math.min(bounds.left, window.innerWidth - 292)), top: Math.max(12, Math.min(bounds.bottom + 6, window.innerHeight - 130)) });
  };
  return <>
    <button ref={trigger} type="button" className="kpi-exact-value" aria-label={`Giá trị chính xác: ${exact}`} aria-describedby={position ? id : undefined}
      onPointerEnter={event => { if (event.pointerType === 'mouse') open(); }} onPointerLeave={() => setPosition(null)}
      onFocus={open} onBlur={() => setPosition(null)} onClick={open} onKeyDown={event => { if (event.key === 'Escape') setPosition(null); }}>
      {children}
    </button>
    {position && createPortal(<div id={id} role="tooltip" className="kpi-exact-tooltip" style={position} onPointerLeave={() => setPosition(null)}><small>Giá trị chính xác</small><span>{exact}</span><button type="button" onClick={() => setPosition(null)} aria-label="Đóng giá trị chính xác">×</button></div>, document.body)}
  </>;
}
