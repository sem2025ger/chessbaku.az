// === stockfish-worker.js ===
// ✅ Stable version for Stockfish 16 WASM (works on Vercel)

let engine = null;
let engineReady = false;

// грузим движок из CDN
importScripts('https://cdn.jsdelivr.net/npm/stockfish@16.1.0/stockfish.js');

engine = STOCKFISH();

function send(cmd) { engine.postMessage(cmd); }

engine.onmessage = function (event) {
  const line = typeof event === "string" ? event : event.data;

  if (line.includes("uciok")) {
    engineReady = true;
    self.postMessage({ type: "ready" });
  }

  if (line.startsWith("bestmove")) {
    const move = line.split(" ")[1];
    self.postMessage({ type: "bestmove", bestmove: move || "(none)" });
  }

  if (line.startsWith("info")) {
    const info = {};
    const depth = line.match(/depth (\d+)/);
    const nodes = line.match(/nodes (\d+)/);
    const nps = line.match(/nps (\d+)/);
    const time = line.match(/time (\d+)/);
    const score = line.match(/score (cp|mate) (-?\d+)/);
    const pv = line.match(/pv (.+)/);

    if (depth) info.depth = depth[1];
    if (nodes) info.nodes = nodes[1];
    if (nps) info.nps = nps[1];
    if (time) info.time = time[1];
    if (score) info.score = score[1] + " " + score[2];
    if (pv) info.pv = pv[1];

    if (Object.keys(info).length > 0) self.postMessage({ type: "info", info });
  }
};

self.onmessage = function (e) {
  const msg = e.data;

  switch (msg.type) {
    case "init":
      send("uci");
      send("setoption name Skill Level value 18"); // 0..20 — сила игры
      send("setoption name MultiPV value 1");
      send("isready");
      break;

    case "analyze":
      send("stop");
      send("position fen " + msg.fen);
      send("go infinite");
      break;

    case "getmove":
      send("stop");
      send("position fen " + msg.fen);
      send("go movetime 1500"); // 1.5 сек на ход
      break;
  }
};
