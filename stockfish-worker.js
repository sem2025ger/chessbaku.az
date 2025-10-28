// stockfish-worker.js

// Загружаем движок Stockfish напрямую из CDN
importScripts('https://unpkg.com/stockfish@16.1.0/src/stockfish.js');

let engine = null;
let ready = false;

function send(cmd) {
  if (engine) engine.postMessage(cmd);
}

engine = typeof STOCKFISH === "function" ? STOCKFISH() : STOCKFISH;
engine.onmessage = function (event) {
  const line = event.data || event;
  if (line === 'uciok') {
    ready = true;
    postMessage({ type: 'ready' });
  } else if (typeof line === 'string') {
    if (line.startsWith('bestmove')) {
      const parts = line.split(' ');
      postMessage({ type: 'bestmove', bestmove: parts[1] });
    } else if (line.startsWith('info')) {
      const info = {};
      const matchers = {
        depth: /depth (\d+)/,
        nodes: /nodes (\d+)/,
        nps: /nps (\d+)/,
        time: /time (\d+)/,
        score: /score (cp|mate) (-?\d+)/,
        pv: /pv (.+)/,
      };
      for (const key in matchers) {
        const match = line.match(matchers[key]);
        if (match) info[key] = match[1] || match[0];
      }
      postMessage({ type: 'info', info });
    }
  }
};

send('uci');

onmessage = function (event) {
  if (!ready) return;
  const { type, fen } = event.data;
  if (type === 'init') {
    send('setoption name Skill Level value 20');
    send('isready');
  } else if (type === 'analyze') {
    send('stop');
    send(`position fen ${fen}`);
    send('go infinite');
  } else if (type === 'getmove') {
    send('stop');
    send(`position fen ${fen}`);
    send('go movetime 1500');
  }
};
