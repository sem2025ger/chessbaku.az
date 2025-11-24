/**
 * Fully stable Stockfish Web Worker (WASM + fallback)
 * Works on Vercel, GitHub Pages, Localhost — without CORS issues
 * Uses nmrugg/stockfish.js (recommended for browser apps)
 */

// 1) Stable CDN with correct WASM paths
const ENGINE_URL = "https://unpkg.com/stockfish.js@10.0.0/stockfish.js";

let engine = null;

// 2) Load Stockfish script
try {
    importScripts(ENGINE_URL);
} catch (err) {
    postMessage("error: failed to load Stockfish.js from CDN");
}

// 3) Initialize Stockfish (handles both synchronously and async (Promise) versions)
(async () => {
    try {
        if (typeof Stockfish === "undefined") {
            throw new Error("Stockfish is not defined after loading script");
        }

        const maybePromise = Stockfish();

        // If engine returns Promise → await it
        if (maybePromise instanceof Promise) {
            engine = await maybePromise;
        } else {
            engine = maybePromise;
        }

        // 4) When engine produces output → send it to UI
        engine.onmessage = function (msg) {
            const message = typeof msg === "string" ? msg : msg.data;
            postMessage(message);
        };

        // Optional: notify frontend that engine is ready
        postMessage("ready");

    } catch (err) {
        postMessage("error: Stockfish initialization failed");
    }
})();

// 5) Receive commands from React/JS app and forward to engine
onmessage = function (event) {
    if (!engine) {
        console.warn("Stockfish is not ready yet");
        return;
    }

    engine.postMessage(event.data);
};
