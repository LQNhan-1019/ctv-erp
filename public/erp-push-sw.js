self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const route = typeof data.route === 'string' && data.route.startsWith('/') && !data.route.startsWith('//')
    ? data.route : '/home';
  event.waitUntil(self.registration.showNotification(data.title || 'CTV ERP', {
    body: data.body || 'Bạn có thông báo mới.',
    icon: '/favicon.ico',
    data: { route },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const route = event.notification.data?.route || '/home';
  const target = new URL(route, self.location.origin);
  if (target.origin !== self.location.origin) return;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    const client = clients.find(item => new URL(item.url).origin === target.origin);
    return client ? client.navigate(target.href).then(() => client.focus()) : self.clients.openWindow(target.href);
  }));
});
