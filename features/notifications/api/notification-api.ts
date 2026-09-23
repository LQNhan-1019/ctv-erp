import type { ApiRequestOptions } from '@/lib/api/client';

type Request = <T>(path: string, options?: ApiRequestOptions) => Promise<T>;
export type NotificationSummary = { unreadTotal: number; unreadByNavigation: Record<string, number> };
export type UserNotification = {
  id: string;
  eventType: 'WORK_SUBMITTED' | 'WORK_APPROVED' | 'WORK_REJECTED' | 'WORK_WITHDRAWN' | 'WORK_ASSIGNED';
  title: string;
  message: string;
  navigationCode: string;
  targetRoute: string;
  resourceId: string;
  readAt: string | null;
  createdAt: string;
};
export type PushConfiguration = { enabled: boolean; publicKey: string | null };
export type BrowserPushSubscription = { endpoint: string; keys: { p256dh: string; auth: string } };

export const getNotificationSummary = (request: Request) =>
  request<NotificationSummary>('/api/notifications/summary');
export const listNotifications = (request: Request) =>
  request<UserNotification[]>('/api/notifications?limit=40');
export const markNotificationRead = (request: Request, id: string) =>
  request<void>('/api/notifications/' + id + '/read', { method: 'POST' });
export const markAllNotificationsRead = (request: Request) =>
  request<number>('/api/notifications/read-all', { method: 'POST' });
export const getPushConfiguration = (request: Request) =>
  request<PushConfiguration>('/api/notifications/push/config');
export const savePushSubscription = (request: Request, body: BrowserPushSubscription) =>
  request<void>('/api/notifications/push/subscriptions', { method: 'POST', body });
export const removePushSubscription = (request: Request, endpoint: string) =>
  request<void>('/api/notifications/push/subscriptions', { method: 'DELETE', body: { endpoint } });

export function browserSubscription(subscription: PushSubscription): BrowserPushSubscription {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error('Trình duyệt không cung cấp đủ khóa thông báo.');
  }
  return { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } };
}

export function decodeVapidKey(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  return Uint8Array.from(raw, character => character.charCodeAt(0));
}
