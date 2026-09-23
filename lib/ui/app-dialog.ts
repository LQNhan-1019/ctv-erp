export type AppDialogKind = 'confirm' | 'prompt' | 'alert';
export type AppDialogOptions = {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  intent?: 'default' | 'danger';
  defaultValue?: string;
  required?: boolean;
};

export type AppDialogTask = {
  id: number;
  kind: AppDialogKind;
  message: string;
  options: AppDialogOptions;
  resolve: (value: boolean | string | null | undefined) => void;
};

const queue: AppDialogTask[] = [];
const listeners = new Set<() => void>();
let nextId = 1;

function notify() {
  listeners.forEach(listener => listener());
}

function enqueue<T extends boolean | string | null | void>(
  kind: AppDialogKind,
  message: string,
  options: AppDialogOptions = {},
): Promise<T> {
  return new Promise(resolve => {
    queue.push({ id: nextId++, kind, message, options, resolve: value => resolve(value as T) });
    notify();
  });
}

export function subscribeAppDialog(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function currentAppDialog() {
  return queue[0] ?? null;
}

export function settleAppDialog(value: boolean | string | null | undefined) {
  const current = queue.shift();
  current?.resolve(value);
  notify();
}

export const appDialog = {
  confirm(message: string, options?: AppDialogOptions) {
    return enqueue<boolean>('confirm', message, options);
  },
  prompt(message: string, defaultValue = '', options?: AppDialogOptions) {
    return enqueue<string | null>('prompt', message, { ...options, defaultValue });
  },
  alert(message: string, options?: AppDialogOptions) {
    return enqueue<void>('alert', message, options);
  },
};
