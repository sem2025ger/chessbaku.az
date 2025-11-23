/**
 * Stable Stockfish 16 WASM worker for Vercel
 * with automatic CDN fallback and async initialization.
 */

// 1) Надёжный набор CDN-ссылок (все проверены)
const CDN_URLS = [
  "https://cdn.jsdelivr.net/npm/stockfish@16.1.0/stockfish.js",
  "https://cdn.jsdelivr.net/npm/stockfish@16.0.0/stockfish.js",
  "https://unpkg.com/stockfish@16.1.0/stockfish.js",
  "https://unpkg.com/stockfish@16.0.0/stockfish.js"
];

let engine = null;
let loaded = false;

// 2) Пытаемся загрузить движок с нескольких CDN
(async function loadEngine() {
  for (const url of CDN_URLS) {
    try {
      importScripts(url);
      loaded = true;
      break;
    } catch (err) {
      // Переходим к следующей ссылке
    }
  }

  if (!loaded) {
    postMessage({ type: "error", value: "Failed to load Stockfish from all CDNs" });
    return;
  }

  // 3) Ждём, пока функция Stockfish() появится в воркере
  await waitForStockfish();

  // 4) Создаём движок
  engine = Stockfish();

  // 5) Передаём в UI, что движок готов
  postMessage({ type: "ready" });

  // 6) Перехватываем всё, что пишет движок, и отправляем в основную страницу
  engine.onmessage = (msg) => {
    if (typeof msg === "string") {
      postMessage({ type: "info", value: msg });
    } else {
      postMessage(msg);
    }
  };
})();

// Ожидание появления глобальной функции Stockfish()
function waitForStockfish() {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (typeof Stockfish === "function") {
        clearInterval(interval);
        resolve();
      }
    }, 30);
  });
}

// 7) Всё, что приходит из app.js — передаём движку
onmessage = function (event) {
  if (!engine) return;
  engine.postMessage(event.data);
};
