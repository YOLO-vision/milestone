// ===== サービスワーカー =====
// アプリの裏で動く小さなプログラム。ページのファイルを読み込むときに間に入って、
// 「ネットにつながらないときは、前に保存しておいたファイルを使う」ようにする。

// 保存場所（キャッシュ）の名前。仕組みを大きく変えたときは、末尾の数字を上げる
const CACHE_NAME = "milestone-v6";

// 最初にまとめて保存しておくファイルの一覧
const FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./sync.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon.svg",
  "./icons/apple-touch-icon.png",
];

// --- インストールされたとき：ファイルをまとめて保存する ---
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(FILES);
    })
  );
  self.skipWaiting(); // 新しいサービスワーカーをすぐに使い始める
});

// --- 使い始めるとき：古い名前の保存場所を消す ---
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names
          .filter(function (name) { return name !== CACHE_NAME; })
          .map(function (name) { return caches.delete(name); })
      );
    })
  );
  self.clients.claim();
});

// --- ファイルを読み込むたび：まずネットから、ダメなら保存したものを使う ---
// （ネット優先にしておくと、アプリを直したときに最新版がすぐ届く）
self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return; // 読み込み以外は何もしない
  // 外のサイトのファイル（同期に使う Firebase など）は、ふつうに読み込んでもらう
  if (new URL(event.request.url).origin !== location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(function (response) {
        // ネットから取れたら、次のために保存し直しておく
        const copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, copy);
        });
        return response;
      })
      .catch(function () {
        // ネットにつながらないときは、保存しておいたものを返す
        return caches.match(event.request, { ignoreSearch: true });
      })
  );
});
