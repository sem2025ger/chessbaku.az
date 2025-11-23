importScripts("https://cdn.jsdelivr.net/npm/stockfish/src/stockfish.wasm.js");

let engine = STOCKFISH();
let ready = false;

// Handler for Stockfish output
engine.onmessage = function (message) {
    if (message === 'uciok') {
        ready = true;
        postMessage({ type: 'ready' });
    } 
    else if (typeof message === 'string') {
        if (message.startsWith('bestmove')) {
            postMessage({ type: 'bestmove', value: message });
        } else {
            postMessage({ type: 'info', value: message });
        }
    }
};

// Handler for messages from main thread
onmessage = function (event) {
    if (engine) {
        engine.postMessage(event.data);
    }
};
