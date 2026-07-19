/*
 * Minimal service worker for NMT Pallet Tracker.
 *
 * Chrome will not offer "Install app" without a service worker that has a
 * fetch handler, so one has to exist. What it must NOT do is cache data.
 *
 * This app reads live inventory from Supabase: pallet status, current location
 * and transaction history all change from other people's scans, in real time.
 * Serving any of that from a cache would show a warehouse worker a pallet as
 * "available" after somebody else has already taken it. So every cross-origin
 * request (Supabase REST, realtime, storage, LINE, Google Fonts) is passed
 * straight through and never touched.
 *
 * Only the app shell -- the HTML, JS, CSS and icons on our own origin -- is
 * cached, network-first: the network answer always wins when it arrives, and
 * the cache is a fallback for when the phone briefly drops off the Wi-Fi.
 */

const CACHE = 'nmt-shell-v1';
const SHELL = ['/', '/index.html', '/favicon.svg', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
    // Take over straight away rather than waiting for every tab to close --
    // otherwise a stale worker can linger for days on a device that is never
    // fully closed, which is exactly how phones are used.
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {
            // A failed precache must not abort the install; the fetch handler
            // below still works without it.
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Never interfere with anything that is not a plain same-origin GET.
    // This is what keeps Supabase reads/writes, auth and image uploads honest.
    if (request.method !== 'GET') return;
    if (new URL(request.url).origin !== self.location.origin) return;

    event.respondWith(
        fetch(request)
            .then((response) => {
                // Only stash successful basic responses.
                if (response && response.ok && response.type === 'basic') {
                    const copy = response.clone();
                    caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
                }
                return response;
            })
            .catch(async () => {
                const hit = await caches.match(request);
                if (hit) return hit;
                // For a navigation with nothing cached, fall back to the shell
                // so the user sees the app rather than the browser's error page.
                if (request.mode === 'navigate') {
                    const shell = await caches.match('/index.html');
                    if (shell) return shell;
                }
                throw new Error('offline and not cached');
            })
    );
});
