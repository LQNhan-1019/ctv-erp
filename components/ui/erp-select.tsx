'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

export type ErpSelectOption = { value: string; label: string; description?: string };

export default function ErpSelect({ value, options, onChange, disabled = false, placeholder = 'Chọn giá trị', ariaLabel }: {
  value: string;
  options: ErpSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find(option => option.value === value);

  useEffect(() => {
    function close(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  function move(step: number) {
    if (!options.length) return;
    const current = Math.max(0, options.findIndex(option => option.value === value));
    const next = options[(current + step + options.length) % options.length];
    onChange(next.value);
  }

  return <div className={`erp-select${open ? ' open' : ''}${disabled ? ' disabled' : ''}`} ref={root}>
    <button type="button" className="erp-select-trigger" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} disabled={disabled} onClick={() => setOpen(current => !current)} onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); move(1); } if (event.key === 'ArrowUp') { event.preventDefault(); move(-1); } if (event.key === 'Escape') setOpen(false); }}>
      <span className="erp-select-option-copy"><b>{selected?.label ?? placeholder}</b>{selected?.description && <small>{selected.description}</small>}</span><ChevronDown />
    </button>
    {open && <div className="erp-select-menu" id={listId} role="listbox">
      {options.map(option => <button type="button" role="option" aria-selected={option.value === value} className={option.value === value ? 'selected' : ''} key={option.value} onClick={() => { onChange(option.value); setOpen(false); }}><span className="erp-select-option-copy"><b>{option.label}</b>{option.description && <small>{option.description}</small>}</span>{option.value === value && <Check />}</button>)}
    </div>}
  </div>;
}
