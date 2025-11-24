/**
 * Stable Stockfish 16 Worker for Vercel
 * Работает со всеми браузерами
 */

const ENGINE_URL = "https://unpkg.com/stockfish@16.1.0/src/stockfish.js";

let engine = null;

try {
    importScripts(ENGINE_URL);
} catch (err) {
    postMessage({ type: "error", value: "Failed to load Stockfish script" });
}

// Ожидаем появления глобальной функции Stockfish()
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

        const sf = Stockfish();

        if (sf instanceof Promise) {
            engine = await sf;
        } else {
            engine = sf;
        }

        engine.onmessage = (event) => {
            const msg = typeof event === "string" ? event : event.data;
            postMessage(msg);
        };

        postMessage("ready");

    } catch (err) {
        console.error(err);
        postMessage({ type: "error", value: err });
    }
})();

onmessage = function (event) {
    if (!engine) {
        console.warn("Engine not ready");
        return;
    }
    engine.postMessage(event.data);
};
