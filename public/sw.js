const CACHE_NAME = "pomodoro-timer-v2";
const STATIC_CACHE = "pomodoro-static-v2";
const DYNAMIC_CACHE = "pomodoro-dynamic-v2";

// Static assets to cache immediately
const STATIC_ASSETS = [
    "/",
    "/index.html",
    "/manifest.json",
    "/favicon.ico",
    "/logo192.png",
    "/logo512.png",
    "/browserconfig.xml",
    "/offline.html",
    // Tailwind CSS from CDN
    "https://cdn.tailwindcss.com",
];

// Function to cache dynamic assets based on asset-manifest.json
async function cacheDynamicAssets() {
    try {
        const manifestResponse = await fetch("/asset-manifest.json");
        const manifest = await manifestResponse.json();

        const cache = await caches.open(DYNAMIC_CACHE);

        // Cache all files from manifest
        const filesToCache = Object.values(manifest.files);
        await cache.addAll(filesToCache);

        console.log("Service Worker: Dynamic assets cached", filesToCache);
    } catch (error) {
        console.log("Service Worker: Failed to cache dynamic assets", error);
    }
}

// Install Service Worker
self.addEventListener("install", (event) => {
    console.log("Service Worker: Installing...");
    event.waitUntil(
        Promise.all([
            // Cache static assets
            caches.open(STATIC_CACHE).then((cache) => {
                console.log("Service Worker: Caching static files");
                return cache.addAll(STATIC_ASSETS);
            }),
            // Fetch and cache dynamic assets
            cacheDynamicAssets(),
        ])
            .then(() => {
                console.log("Service Worker: Installation complete");
                return self.skipWaiting();
            })
            .catch((error) => {
                console.log("Service Worker: Installation failed", error);
            })
    );
});

// Activate Service Worker
self.addEventListener("activate", (event) => {
    console.log("Service Worker: Activating...");
    event.waitUntil(
        Promise.all([
            // Clear old caches
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cache) => {
                        if (
                            cache !== STATIC_CACHE &&
                            cache !== DYNAMIC_CACHE &&
                            cache !== CACHE_NAME
                        ) {
                            console.log(
                                "Service Worker: Clearing old cache",
                                cache
                            );
                            return caches.delete(cache);
                        }
                    })
                );
            }),
            // Take control of all clients
            self.clients.claim(),
        ])
    );
});

// Fetch event - Cache First Strategy with fallbacks
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== "GET") {
        return;
    }

    // Handle different types of requests
    if (url.pathname.startsWith("/static/")) {
        // Static assets - cache first
        event.respondWith(cacheFirst(request));
    } else if (url.origin === location.origin) {
        // Same origin requests - cache first with network fallback
        event.respondWith(cacheFirstWithFallback(request));
    } else {
        // External requests (like Tailwind CSS) - network first with cache fallback
        event.respondWith(networkFirstWithCache(request));
    }
});

// Cache first strategy
async function cacheFirst(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log("Cache first failed:", error);
        return caches.match("/offline.html");
    }
}

// Cache first with fallback strategy
async function cacheFirstWithFallback(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log("Cache first with fallback failed:", error);
        // Return offline page for navigation requests
        if (request.destination === "document") {
            return caches.match("/offline.html");
        }
        // Return cached assets or offline indicator
        return (
            caches.match(request) || new Response("Offline", { status: 503 })
        );
    }
}

// Network first with cache fallback strategy
async function networkFirstWithCache(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log("Network first failed, trying cache:", error);
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        return new Response("Offline", { status: 503 });
    }
}

// Background Sync for offline functionality
self.addEventListener("sync", (event) => {
    if (event.tag === "pomodoro-sync") {
        console.log("Service Worker: Background sync triggered");
        event.waitUntil(syncData());
    }
});

async function syncData() {
    try {
        // Sync any pending data when back online
        console.log("Service Worker: Syncing data...");
        // Add your sync logic here (e.g., save timer sessions to server)
    } catch (error) {
        console.log("Service Worker: Sync failed", error);
    }
}

// Push notification support
self.addEventListener("push", (event) => {
    const data = event.data ? event.data.json() : {};
    const options = {
        body: data.body || "Time to take a break!",
        icon: "/logo192.png",
        badge: "/favicon.ico",
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: data.id || 1,
            url: data.url || "/",
        },
        actions: [
            {
                action: "start",
                title: "Start Timer",
                icon: "/logo192.png",
            },
            {
                action: "close",
                title: "Close",
                icon: "/favicon.ico",
            },
        ],
        requireInteraction: true,
        silent: false,
    };

    event.waitUntil(
        self.registration.showNotification(
            data.title || "Pomodoro Timer",
            options
        )
    );
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
    console.log("Notification click received.");

    event.notification.close();

    const urlToOpen = event.notification.data?.url || "/";

    if (event.action === "start") {
        // Open the app and start timer
        event.waitUntil(
            clients.matchAll({ type: "window" }).then((clientList) => {
                // If app is already open, focus it
                for (const client of clientList) {
                    if (
                        client.url.includes(location.origin) &&
                        "focus" in client
                    ) {
                        return client.focus();
                    }
                }
                // Otherwise open new window
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen + "?action=start");
                }
            })
        );
    } else {
        // Open the app
        event.waitUntil(
            clients.matchAll({ type: "window" }).then((clientList) => {
                for (const client of clientList) {
                    if (
                        client.url.includes(location.origin) &&
                        "focus" in client
                    ) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
        );
    }
});

// Periodic background sync (if supported)
self.addEventListener("periodicsync", (event) => {
    if (event.tag === "pomodoro-reminder") {
        event.waitUntil(sendPeriodicReminder());
    }
});

async function sendPeriodicReminder() {
    try {
        // Send periodic reminders about taking breaks
        const registration = await self.registration;
        await registration.showNotification("Pomodoro Reminder", {
            body: "Don't forget to use your Pomodoro Timer for better productivity!",
            icon: "/logo192.png",
            badge: "/favicon.ico",
            tag: "reminder",
            renotify: true,
        });
    } catch (error) {
        console.log("Periodic reminder failed:", error);
    }
}
