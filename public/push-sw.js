// Importado pelo service worker gerado pelo vite-plugin-pwa: recebe e mostra os lembretes.
self.addEventListener('push', (event) => {
  const d = event.data ? event.data.json() : {}
  event.waitUntil(
    self.registration.showNotification(d.title || 'Tarefas', {
      body: d.body,
      icon: d.icon || '/pwa-192x192.png',
      tag: d.tag,
      data: d.url || '/',
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const aberta = list.find((c) => 'focus' in c)
      return aberta ? aberta.focus() : clients.openWindow(event.notification.data || '/')
    }),
  )
})
