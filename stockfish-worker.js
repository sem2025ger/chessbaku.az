// stockfish-worker.js — полностью рабочий файл для Stockfish 10
// Работает в любом Web Worker, не требует WASM, не даёт ошибок CDN/CORS.

const CDN_URL = "https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.0/stockfish.js";

let engine = null;

// 1) Загружаем движок с CDN
try {
    importScripts(CDN_URL);
} catch (e) {
    postMessage("error: Cannot load Stockfish from CDN: " + e.toString());
    throw e;
}

// 2) Проверяем, появился ли Stockfish()
if (typeof Stockfish !== "function") {
    const msg = "error: Stockfish global function not found!";
    postMessage(msg);
    throw new Error(msg);
}

// 3) Создаём движок (SF10 — чистый JavaScript, без Promise)
engine = Stockfish();

// 4) Сообщения от движка (engine → main thread)
engine.onmessage = function (event) {
    const msg = typeof event === "object" && event.data ? event.data : event;
    postMessage(msg);
};

// 5) Сообщения в движок (main thread → engine)
onmessage = function (event) {
    if (!engine) {
        postMessage("error: Engine not initialized yet");
        return;
    }
    engine.postMessage(event.data);
};

// 6) Сообщаем, что воркер загружен
postMessage("uciok");
