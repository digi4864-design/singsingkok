const CACHE_NAME = "farm-mall-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 네트워크 우선, 실패 시 캐시로 폴백 (오프라인에서도 마지막으로 본 페이지가 보이도록)
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// 관리자 신규가입/신규주문 알림 - apps/web/src/lib/push.ts에서 보낸 푸시를 화면에 띄운다.
self.addEventListener("push", (event) => {
  let data = { title: "싱싱콕", body: "", url: "/admin" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    // 이 서버 사이드에서는 항상 JSON으로 보내지만, 형식이 다른 경우에도 알림 자체는 깨지지 않게 한다.
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon.svg",
      data: { url: data.url },
    })
  );
});

// 알림 클릭 시 관련 화면(주문/회원 관리 등)으로 이동한다. 이미 열려있는 탭이 있으면 그 탭을 재사용한다.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/admin";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
