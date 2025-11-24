/**
 * Stockfish 16 WASM — стабильный рабочий worker для Vercel
 */

const ENGINE_URL = "https://stockfishchess.org/js/stockfish.wasm.js";

let engine = null;

// Загружаем Stockfish WASM
try {
  importScripts(ENGINE_URL);
} catch (err) {
  postMessage({ type: "error", value: "Failed to load Stockfish WASM" });
}

// Ждём появления глобальной функции Stockfish()
function waitForStockfish() {
  return new Promise((resolve) => {
    const check = setInterval(() => {
      if (typeof Stockfish === "function") {
        clearInterval(check);
        resolve();
      }
    }, 20);
  });
}

(async () => {
  await waitForStockfish();

  engine = Stockfish();
  postMessage({ type: "ready" });

  engine.onmessage = (msg) => {
    if (typeof msg === "string") {
      postMessage({ type: "info", value: msg });
    } else {
      postMessage(msg);
    }
  };
})();

onmessage = function (event) {
  if (engine) engine.postMessage(event.data);
};
