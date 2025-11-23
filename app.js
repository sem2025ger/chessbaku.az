// app.js — ChessBaku (исправлено под Stockfish 10 UCI worker)

// DOM
const evaluationEl = document.getElementById('evaluation');
const depthEl = document.getElementById('depth');
const nodesEl = document.getElementById('nodes');
const speedEl = document.getElementById('speed');
const timeEl = document.getElementById('time');
const bestMoveEl = document.getElementById('bestmove');
const pvEl = document.getElementById('pv');
const statusEl = document.getElementById('status');
const moveHistoryEl = document.getElementById('moveHistory');

let board = null;
let game = new Chess();
let engineThinking = false;

// Stockfish worker (SF10)
const engine = new Worker('stockfish-worker.js');

// --- UCI helpers ---
let engineReady = false;
let lastInfo = {};

// Инициализация движка
function initEngine() {
  engine.postMessage("uci");
  engine.postMessage("isready");
  engine.postMessage("ucinewgame");
  engine.postMessage("setoption name Threads value 2");
  engine.postMessage("setoption name Hash value 64");
}

// Отправка позиции на анализ
function analyzePosition() {
  if (game.game_over() || !engineReady) return;

  engine.postMessage("stop");
  engine.postMessage(`position fen ${game.fen()}`);
  // Можно менять глубину под себя
  engine.postMessage("go depth 14");
}

// Запрос хода движка
function requestEngineMove() {
  if (game.game_over() || !engineReady) return;

  engineThinking = true;
  engine.postMessage("stop");
  engine.postMessage(`position fen ${game.fen()}`);
  engine.postMessage("go depth 12");
}

// --- Parsing UCI output ---
function handleInfoLine(line) {
  // Пример: "info depth 12 seldepth 18 score cp 23 nodes 12345 nps 456789 time 123 pv e2e4 e7e5 ..."
  const info = {};

  const depthMatch = line.match(/\bdepth (\d+)/);
  if (depthMatch) info.depth = depthMatch[1];

  const nodesMatch = line.match(/\bnodes (\d+)/);
  if (nodesMatch) info.nodes = nodesMatch[1];

  const npsMatch = line.match(/\bnps (\d+)/);
  if (npsMatch) info.nps = npsMatch[1];

  const timeMatch = line.match(/\btime (\d+)/);
  if (timeMatch) info.time = timeMatch[1];

  const scoreCpMatch = line.match(/\bscore cp (-?\d+)/);
  const scoreMateMatch = line.match(/\bscore mate (-?\d+)/);
  if (scoreCpMatch) info.score = `cp ${scoreCpMatch[1]}`;
  if (scoreMateMatch) info.score = `mate ${scoreMateMatch[1]}`;

  const pvMatch = line.match(/\bpv (.+)$/);
  if (pvMatch) info.pv = pvMatch[1];

  lastInfo = { ...lastInfo, ...info };
  updateAnalysis(lastInfo);
}

function handleBestMoveLine(line) {
  // Пример: "bestmove e2e4 ponder e7e5"
  const parts = line.split(" ");
  const moveStr = parts[1];

  bestMoveEl.textContent = moveStr || "";

  if (engineThinking && moveStr && moveStr !== "(none)") {
    makeEngineMove(moveStr);
  }
  engineThinking = false;

  // После хода движка — новый анализ
  analyzePosition();
}

// UI update
function updateAnalysis(info) {
  if (info.depth) depthEl.textContent = info.depth;

  if (info.nodes) {
    const nodes = parseInt(info.nodes, 10);
    if (nodes > 1000000) nodesEl.textContent = (nodes / 1000000).toFixed(2) + "M";
    else if (nodes > 1000) nodesEl.textContent = (nodes / 1000).toFixed(1) + "k";
    else nodesEl.textContent = nodes;
  }

  if (info.nps) {
    const nps = parseInt(info.nps, 10);
    speedEl.textContent = (nps / 1000).toFixed(1) + " kn/s";
  }

  if (info.time) {
    const t = parseInt(info.time, 10);
    timeEl.textContent = (t / 1000).toFixed(1) + "s";
  }

  if (info.score) {
    const cpMatch = info.score.match(/cp (-?\d+)/);
    const mateMatch = info.score.match(/mate (-?\d+)/);

    if (cpMatch) {
      const val = parseInt(cpMatch[1], 10);
      evaluationEl.textContent = (val / 100.0).toFixed(2);
    } else if (mateMatch) {
      evaluationEl.textContent = "M" + mateMatch[1];
    }
  }

  if (info.pv) {
    pvEl.textContent = info.pv;
    const firstMove = info.pv.split(" ")[0];
    if (firstMove) bestMoveEl.textContent = firstMove;
  }
}

// Make engine move on board
function makeEngineMove(moveStr) {
  if (!moveStr || moveStr === "(none)") return;

  const from = moveStr.substring(0, 2);
  const to = moveStr.substring(2, 4);
  const promotion = moveStr.length > 4 ? moveStr.substring(4, 5) : undefined;

  const move = game.move({ from, to, promotion });
  if (move) {
    updateBoard();
  }
}

// --- Chessboard events ---
function onDragStart(source, piece) {
  if (game.game_over() || engineThinking) return false;

  if ((game.turn() === 'w' && piece.startsWith('b')) ||
      (game.turn() === 'b' && piece.startsWith('w'))) {
    return false;
  }
  return true;
}

function onDrop(source, target) {
  const move = game.move({
    from: source,
    to: target,
    promotion: 'q'
  });

  if (move === null) return 'snapback';

  updateBoard();

  if (!game.game_over()) {
    requestEngineMove();
  }
}

function onSnapEnd() {
  board.position(game.fen());
}

// --- Board + status ---
function updateMoveHistory() {
  if (!moveHistoryEl) return;
  const history = game.history();
  let html = '';
  for (let i = 0; i < history.length; i += 2) {
    const num = Math.floor(i / 2) + 1;
    html += num + '. ' + history[i];
    if (history[i + 1]) html += ' ' + history[i + 1];
    html += '<br>';
  }
  moveHistoryEl.innerHTML = html;
}

function updateBoard() {
  board.position(game.fen());

  let status = '';
  const moveColor = game.turn() === 'w' ? 'Белые' : 'Чёрные';

  if (game.in_checkmate()) status = 'Игра окончена. ' + moveColor + ' получили мат.';
  else if (game.in_draw()) status = 'Игра окончена. Ничья.';
  else if (game.in_stalemate()) status = 'Игра окончена. Пат.';
  else if (game.in_threefold_repetition()) status = 'Игра окончена. Троекратное повторение позиции.';
  else {
    status = moveColor + ' ходят';
    if (game.in_check()) status += '. Шах!';
  }

  if (statusEl) statusEl.textContent = status;
  updateMoveHistory();

  analyzePosition();
}

// --- Engine known messages ---
engine.onmessage = function (event) {
  const line = String(event.data).trim();

  if (!line) return;

  if (line === "uciok") {
    engineReady = true;
    return;
  }

  if (line === "readyok") {
    engineReady = true;
    analyzePosition();
    return;
  }

  if (line.startsWith("info ")) {
    handleInfoLine(line);
    return;
  }

  if (line.startsWith("bestmove ")) {
    handleBestMoveLine(line);
    return;
  }
};

// --- UI buttons ---
document.getElementById('newGameBtn')?.addEventListener('click', () => {
  game.reset();
  engineThinking = false;
  lastInfo = {};
  updateBoard();
});

document.getElementById('undoBtn')?.addEventListener('click', () => {
  if (game.history().length >= 2) {
    game.undo();
    game.undo();
  } else if (game.history().length === 1) {
    game.undo();
  }
  engineThinking = false;
  updateBoard();
});

document.getElementById('flipBtn')?.addEventListener('click', () => {
  board.flip();
});

// --- Init board ---
const config = {
  draggable: true,
  position: 'start',
  onDragStart,
  onDrop,
  onSnapEnd,
  pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
};

board = Chessboard('board', config);
updateBoard();
initEngine();
