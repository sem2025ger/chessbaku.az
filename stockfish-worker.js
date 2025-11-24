/**
 * Stable Stockfish 16 WASM Worker for Vercel
 * Работает во всех браузерах
 */

const ENGINE_URL = "https://cdn.jsdelivr.net/gh/nmrugg/stockfish.js/stockfish.wasm.js";

let engine = null;

// Загружаем движок
try {
    importScripts(ENGINE_URL);
} catch (err) {
    postMessage({ type: "error", value: "Failed to load Stockfish script" });
}

// Ждем появления глобальной функции Stockfish()
function waitForStockfish() {
    return new Promise((resolve, reject) => {
        const check = setInterval(() => {
            if (typeof Stockfish === "function") {
                clearInterval(check);
                resolve();
            }
        }, 50);

        setTimeout(() => {
            clearInterval(check);
            reject("Stockfish global not found");
        }, 5000);
    });
}

(async () => {
    try {
        await waitForStockfish();

        // Создаём движок
        engine = Stockfish();

        // Обратные сообщения от движка → в UI
        engine.onmessage = function (msg) {
            const text = typeof msg === "string" ? msg : msg.data;
            postMessage(text);
        };

        postMessage("ready");

    } catch (err) {
        postMessage({ type: "error", value: err });
    }
})();

// Получаем команды от UI → отправляем движку
onmessage = function (event) {
    if (!engine) {
        postMessage("Engine not ready");
        return;
    }
    engine.postMessage(event.data);
};

