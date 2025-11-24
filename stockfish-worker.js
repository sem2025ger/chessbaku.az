/**
 * Stable Stockfish 16 WASM Worker for Vercel
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
        }, 50);
    });
}

// Инициализация
(async () => {
    await waitForStockfish();
    engine = Stockfish();
})();

// Что Stockfish пишет – отправляем обратно
onmessage = function (event) {
    if (engine) {
        engine.onmessage = function (msg) {
            postMessage(msg);
        };
        engine.postMessage(event.data);
    }
};
