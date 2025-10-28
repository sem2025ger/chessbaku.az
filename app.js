// app.js — ChessBaku (исправленная версия)

// Проверяем, что все элементы существуют
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
let playerColor = 'w'; // игрок играет за белых
let engineThinking = false;

// создаём воркер со Stockfish
const engine = new Worker('stockfish-worker.js');

// функция обновления анализа
function updateAnalysis(info) {
  if (info.depth) depthEl.textContent = info.depth;
  if (info.nodes) {
    const nodes = parseInt(info.nodes);
    if (nodes > 1000000) {
      nodesEl.textContent = (nodes / 1000000).toFixed(2) + "M";
    } else if (nodes > 1000) {
      nodesEl.textContent = (nodes / 1000).toFixed(1) + "k";
    } else {
      nodesEl.textContent = nodes;
    }
  }
  if (info.nps) {
    const nps = parseInt(info.nps);
    speedEl.textContent = (nps / 1000).toFixed(1) + " kn/s";
  }
  if (info.time) {
    const time = parseInt(info.time);
    timeEl.textContent = (time / 1000).toFixed(1) + "s";
  }
  if (info.score) {
    const cpMatch = info.score.match(/cp (-?\d+)/);
    const mateMatch = info.score.match(/mate (-?\d+)/);
    
    if (cpMatch) {
      const val = parseInt(cpMatch[1]);
      evaluationEl.textContent = (val / 100.0).toFixed(2);
    } else if (mateMatch) {
      const val = parseInt(mateMatch[1]);
      evaluationEl.textContent = "M" + val;
    }
  }
  if (info.pv) {
    pvEl.textContent = info.pv;
    // Обновляем лучший ход (первый ход из PV)
    const firstMove = info.pv.split(' ')[0];
    if (firstMove) {
      bestMoveEl.textContent = firstMove;
    }
  }
}

// функция отправки позиции на анализ
function analyze() {
  if (!game.game_over()) {
    engine.postMessage({ type: "analyze", fen: game.fen() });
  }
}

// события от движка
engine.onmessage = function (event) {
  const msg = event.data;
  
  if (msg.type === "ready") {
    console.log("Stockfish готов!");
    analyze();
  } else if (msg.type === "info") {
    updateAnalysis(msg.info);
  } else if (msg.type === "bestmove") {
    if (engineThinking && msg.bestmove && msg.bestmove !== "(none)") {
      makeEngineMove(msg.bestmove);
    }
    engineThinking = false;
  }
};

// инициализация движка
engine.postMessage({ type: "init" });

// функция для хода движка
function makeEngineMove(moveStr) {
  if (!moveStr || moveStr === "(none)") return;
  
  const from = moveStr.substring(0, 2);
  const to = moveStr.substring(2, 4);
  const promotion = moveStr.length > 4 ? moveStr.substring(4, 5) : undefined;
  
  const move = game.move({
    from: from,
    to: to,
    promotion: promotion
  });
  
  if (move) {
    updateBoard();
    analyze();
  }
}

// функция при начале перетаскивания фигур
function onDragStart(source, piece, position, orientation) {
  // Запрещаем ход если:
  // - игра окончена
  // - движок думает
  // - не ход игрока
  if (game.game_over()) return false;
  if (engineThinking) return false;
  
  // Проверяем, что игрок двигает свои фигуры
  if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false;
  }
  
  return true;
}

// функция, вызываемая при отпускании фигуры
function onDrop(source, target) {
  // Пытаемся сделать ход
  const move = game.move({
    from: source,
    to: target,
    promotion: 'q' // всегда превращаем в ферзя
  });
  
  // Если ход невалидный - возвращаем фигуру
  if (move === null) return 'snapback';
  
  // Обновляем доску и запускаем анализ
  updateBoard();
  
  // Если игра не окончена, запрашиваем ход движка
  if (!game.game_over()) {
    engineThinking = true;
    setTimeout(() => {
      engine.postMessage({ type: "getmove", fen: game.fen() });
    }, 250);
  }
}

// при завершении движения фигуры
function onSnapEnd() {
  board.position(game.fen());
}

// обновление доски и статуса
function updateBoard() {
  board.position(game.fen());
  
  let status = '';
  let moveColor = game.turn() === 'w' ? 'Белые' : 'Чёрные';
  
  if (game.in_checkmate()) {
    status = 'Игра окончена. ' + moveColor + ' получили мат.';
  } else if (game.in_draw()) {
    status = 'Игра окончена. Ничья.';
  } else if (game.in_stalemate()) {
    status = 'Игра окончена. Пат.';
  } else if (game.in_threefold_repetition()) {
    status = 'Игра окончена. Троекратное повторение позиции.';
  } else {
    status = moveColor + ' ходят';
    if (game.in_check()) {
      status += '. Шах!';
    }
  }
  
  document.getElementById('status').textContent = status;
  
  // Обновляем историю ходов
  updateMoveHistory();
}

// функция обновления истории ходов
function updateMoveHistory() {
  const history = game.history();
  const moveHistoryEl = document.getElementById('moveHistory');
  
  if (moveHistoryEl) {
    let historyHTML = '';
    for (let i = 0; i < history.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      historyHTML += moveNum + '. ' + history[i];
      if (history[i + 1]) {
        historyHTML += ' ' + history[i + 1];
      }
      historyHTML += '<br>';
    }
    moveHistoryEl.innerHTML = historyHTML;
  }
}

// кнопки управления
document.getElementById('newGameBtn').addEventListener('click', () => {
  game.reset();
  engineThinking = false;
  updateBoard();
  analyze();
});

document.getElementById('undoBtn').addEventListener('click', () => {
  // Отменяем два хода (игрока и движка)
  if (game.history().length >= 2) {
    game.undo();
    game.undo();
  } else if (game.history().length === 1) {
    game.undo();
  }
  engineThinking = false;
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
  pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
};

board = Chessboard('board', config);

// Первоначальное обновление
updateBoard();

// Запускаем анализ после загрузки
window.addEventListener('load', () => {
  analyze();
});
