'use client';

import { AlertTriangle, HelpCircle, Info, X } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { currentAppDialog, settleAppDialog, subscribeAppDialog, type AppDialogTask } from '@/lib/ui/app-dialog';

function cancelValue(task: AppDialogTask) {
  return task.kind === 'prompt' ? null : task.kind === 'alert' ? undefined : false;
}

function DialogContent({ task }: { task: AppDialogTask }) {
  const [value, setValue] = useState(task.options.defaultValue ?? '');
  const panelRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const danger = task.options.intent === 'danger' ||
    (/^(Xóa|Gỡ|Ngừng sử dụng|Ghi đè)/i.test(task.message) && task.options.intent !== 'default');
  const title = task.options.title ?? (task.kind === 'alert' ? 'Thông báo' :
    task.kind === 'prompt' ? 'Nhập ý kiến' : danger ? 'Xác nhận thao tác' : 'Xác nhận');

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    (task.kind === 'prompt' ? inputRef.current : cancelRef.current ?? panelRef.current)?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [task]);

  function submit() {
    if (task.kind === 'prompt') {
      if (task.options.required && !value.trim()) {
        inputRef.current?.focus();
        return;
      }
      settleAppDialog(value.trim());
    } else {
      settleAppDialog(true);
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      settleAppDialog(cancelValue(task));
      return;
    }
    if (event.key === 'Enter' && (task.kind !== 'prompt' || event.ctrlKey)) {
      event.preventDefault();
      submit();
      return;
    }
    if (event.key !== 'Tab' || !panelRef.current) return;
    const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button:not(:disabled),textarea:not(:disabled)'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  }

  const Icon = danger ? AlertTriangle : task.kind === 'alert' ? Info : HelpCircle;
  return <div className="erp-dialog-backdrop" onMouseDown={event => {
    if (event.target === event.currentTarget) settleAppDialog(cancelValue(task));
  }}>
    <section className={'erp-dialog-panel ' + (danger ? 'danger' : '')} role="dialog" aria-modal="true"
      aria-labelledby="erp-dialog-title" aria-describedby="erp-dialog-message" tabIndex={-1}
      ref={panelRef} onKeyDown={onKeyDown}>
      <header>
        <span className="erp-dialog-icon"><Icon aria-hidden="true" /></span>
        <div><small>CTV ERP</small><h2 id="erp-dialog-title">{title}</h2></div>
        <button type="button" className="erp-dialog-close" aria-label="Đóng" onClick={() => settleAppDialog(cancelValue(task))}><X /></button>
      </header>
      <p id="erp-dialog-message">{task.message}</p>
      {task.kind === 'prompt' && <label className="erp-dialog-input"><span>{task.options.required ? 'Nội dung bắt buộc' : 'Nội dung (không bắt buộc)'}</span>
        <textarea ref={inputRef} value={value} onChange={event => setValue(event.target.value)}
          maxLength={1000} rows={3} placeholder="Nhập nội dung..." /></label>}
      <footer>
        {task.kind !== 'alert' && <button type="button" ref={cancelRef} className="erp-dialog-cancel"
          onClick={() => settleAppDialog(cancelValue(task))}>{task.options.cancelLabel ?? 'Hủy'}</button>}
        <button type="button" className="erp-dialog-accept" onClick={submit}
          disabled={task.kind === 'prompt' && task.options.required && !value.trim()}>
          {task.options.confirmLabel ?? (task.kind === 'alert' ? 'Đã hiểu' : task.kind === 'prompt' ? 'Lưu ý kiến' : 'Xác nhận')}
        </button>
      </footer>
    </section>
  </div>;
}

export default function AppDialogHost() {
  const task = useSyncExternalStore(subscribeAppDialog, currentAppDialog, () => null);
  return task ? <DialogContent key={task.id} task={task} /> : null;
}
