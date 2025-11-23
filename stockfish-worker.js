importScripts("https://cdn.jsdelivr.net/npm/stockfish/src/stockfish.wasm.js");

const engine = STOCKFISH();

// Всё, что движок пишет — отправляем как есть (строкой)
engine.onmessage = function (msg) {
  postMessage(msg);
};

// Всё, что приходит из app.js — пересылаем в движок
onmessage = function (event) {
  engine.postMessage(event.data);
};
