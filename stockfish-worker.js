// stockfish-worker.js

// 1) Набор рабочих CDN-ссылок на Stockfish 16.
// Первая загрузившаяся ссылка — используется.
const CDN_URLS = [
  "https://cdn.jsdelivr.net/npm/stockfish@16.1.0/stockfish.js",
  "https://cdn.jsdelivr.net/npm/stockfish@16.0.0/stockfish.js",
  "https://unpkg.com/stockfish@16.1.0/stockfish.js",
  "https://unpkg.com/stockfish@16.0.0/stockfish.js"
];

let loaded = false;

// 2) Пытаемся загрузить движок с любого CDN
for (const url of CDN_URLS) {
  try {
    importScripts(url);
    loaded = true;
    break;
  } catch (e) {
    // продолжаем пробовать другие ссылки
  }
}

// 3) Если движок не загрузился — сообщаем об ошибке
if (!loaded) {
  postMessage("Stockfish CDN load failed");
  throw new Error("Stockfish CDN load failed");
}

// 4) Создаём движок (в этих сборках глобальная функция Stockfish() уже есть)
const engine = Stockfish();

// 5) Всё, что движок пишет — отсылаем назад как строку
engine.onmessage = function (msg) {
  postMessage(msg);
};

// 6) Всё, что приходит из app.js — пересылаем в движок
onmessage = function (event) {
  engine.postMessage(event.data);
};
