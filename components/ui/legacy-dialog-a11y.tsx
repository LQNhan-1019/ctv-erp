'use client';

import { useEffect } from 'react';

const panelSelector = [
  '.nova-overlay > .nova-dialog',
  '.nova-overlay > .nova-access-drawer',
  '.nova-overlay > .nova-audit-drawer',
  '.modal-backdrop > .order-modal',
  '.drawer-backdrop > .drawer',
].join(',');

const focusableSelector = [
  'button:not(:disabled)',
  '[href]',
  'input:not(:disabled):not([type="hidden"])',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Compatibility bridge for legacy feature dialogs. New dialogs should use a
 * shared semantic dialog component; this keeps existing CRUD screens keyboard
 * operable while they are migrated without changing their business behavior.
 */
export default function LegacyDialogA11y() {
  useEffect(() => {
    let activePanel: HTMLElement | null = null;
    let previousFocus: HTMLElement | null = null;
    let sequence = 0;

    const visiblePanels = () => Array.from(document.querySelectorAll<HTMLElement>(panelSelector))
      .filter(panel => panel.getClientRects().length > 0);

    const enhance = () => {
      const panel = visiblePanels().at(-1) ?? null;
      if (panel === activePanel) return;

      if (!panel) {
        activePanel = null;
        previousFocus?.focus({ preventScroll: true });
        previousFocus = null;
        return;
      }

      if (!activePanel) previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      activePanel = panel;
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      panel.tabIndex = -1;

      const heading = panel.querySelector<HTMLElement>('h1,h2,h3');
      if (heading) {
        if (!heading.id) heading.id = `legacy-dialog-title-${++sequence}`;
        panel.setAttribute('aria-labelledby', heading.id);
      } else if (!panel.hasAttribute('aria-label')) {
        panel.setAttribute('aria-label', 'Hộp thoại CTV ERP');
      }

      const closeButton = panel.querySelector<HTMLButtonElement>('header button');
      if (closeButton && !closeButton.getAttribute('aria-label') && !closeButton.textContent?.trim()) {
        closeButton.setAttribute('aria-label', 'Đóng hộp thoại');
      }

      window.requestAnimationFrame(() => {
        const preferred = panel.querySelector<HTMLElement>('[data-autofocus], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled)');
        (preferred ?? panel).focus({ preventScroll: true });
      });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!activePanel || !document.contains(activePanel)) return;
      if (event.key === 'Escape') {
        const closeButton = activePanel.querySelector<HTMLButtonElement>('header button, [aria-label*="Đóng"]');
        if (closeButton) {
          event.preventDefault();
          closeButton.click();
        }
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(activePanel.querySelectorAll<HTMLElement>(focusableSelector))
        .filter(element => element.getClientRects().length > 0);
      if (!focusable.length) {
        event.preventDefault();
        activePanel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('keydown', onKeyDown);
    enhance();
    return () => {
      observer.disconnect();
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return null;
}
