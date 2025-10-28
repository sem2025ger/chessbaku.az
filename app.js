// app.js — ChessBaku (рабочая версия)

// Проверяем, что библиотека chess.js подключена
const boardElement = document.getElementById('board');
const evaluationEl = document.getElementById('evaluation');
const depthEl = document.getElementById('depth');
const nodesEl = document.getElementById('nodes');
const speedEl = document.getElementById('speed');
const timeEl = document.getElementById('time');
const bestMoveEl = document.getElementById('bestmove');
const pvEl = document.getElementById('pv');

let board = null;
let game = new Chess();

// создаём воркер со Stockfish (загружается с CDN)
const engine = new Worker('stockfish-worker.js');

// функция обновления анализа
function updateAnalysis(info) {
  if (info.depth) depthEl.textContent = info.depth;
  if (info.nodes) nodesEl.textContent = info.nodes;
  if (info.nps) speedEl.textContent = (info.nps / 1000).toFixed(1) + " kn/s";
  if (info.time) timeEl.textContent = (info.time / 1000).toFixed(1) + "s";
  if (info.score) {
    const type = info.score.match(/(cp|mate)/)[1];
    const val = parseInt(info.score.match(/-?\d+/)[0]);
    evaluationEl.textContent =
      type === "cp" ? (val / 100.0).toFixed(2) : "M" + val;
  }
  if (info.pv) pvEl.textContent = info.pv;
}

// функция отправки позиции на анализ
function analyze() {
  engine.postMessage({ type: "analyze", fen: game.fen() });
}

// события от движка
engine.onmessage = function (event) {
  const msg = event.data;
  if (msg.type === "ready") {
    console.log("Stockfish ready!");
    analyze();
  } else if (msg.type === "info") {
    updateAnalysis(msg.info);
  } else if (msg.type === "bestmove") {
    bestMoveEl.textContent = msg.bestmove;
  }
};

// инициализация движка
engine.postMessage({ type: "init" });

// функция при перемещении фигур
function onDragStart(source, piece) {
  if (game.game_over() || (game.turn() === 'w' && piece.startsWith('b')) || (game.turn() === 'b' && piece.startsWith('w'))) {
    return false;
  }
}

// функция, вызываемая при отпускании фигуры
function onDrop(source, target) {
  const move = game.move({ from: source, to: target, promotion: 'q' });
  if (move === null) return 'snapback';
  updateBoard();
  engine.postMessage({ type: "getmove", fen: game.fen() });
}

// при завершении движения фигуры
function onSnapEnd() {
  updateBoard();
  analyze();
}

// обновление доски
function updateBoard() {
  board.position(game.fen());
  document.getElementById('status').textContent = (game.turn() === 'w' ? 'White' : 'Black') + " to move";
}

// кнопки управления
document.getElementById('newGameBtn').addEventListener('click', () => {
  game.reset();
  updateBoard();
  analyze();
});

document.getElementById('undoBtn').addEventListener('click', () => {
  game.undo();
  updateBoard();
  analyze();
});

document.getElementById('flipBtn').addEventListener('click', () => {
  board.flip();
});

// инициализация шахматной доски
const config = {
  draggable: true,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd,
  pieceTheme: 'https://cdnjs.cloudflare.com/ajax/libs/chessboardjs/1.0.0/img/chesspieces/wikipedia/{piece}.png'
};
board = Chessboard('board', config);

updateBoard();
