// === ChessBaku app.js ===

let board = null;
let game = new Chess();
let stockfishWorker = null;

// === Initialize Stockfish Engine ===
function initStockfish() {
  stockfishWorker = new Worker("stockfish-worker.js");

  stockfishWorker.onmessage = function (event) {
    const message = event.data;

    if (message.type === "ready") {
      updateEngineStatus("✅ Engine ready");
      startAnalysis();
    } else if (message.type === "bestmove") {
      makeAIMove(message.bestmove);
    } else if (message.type === "info") {
      updateAnalysisPanel(message.info);
    }
  };

  updateEngineStatus("⚙️ Loading Stockfish...");
  stockfishWorker.postMessage({ type: "init" });
}

// === Update analysis info ===
function updateAnalysisPanel(info) {
  if (info.depth) document.getElementById("depth").textContent = info.depth;
  if (info.nodes)
    document.getElementById("nodes").textContent =
      (parseInt(info.nodes) / 1000000).toFixed(2) + "M";
  if (info.nps)
    document.getElementById("nps").textContent =
      (parseInt(info.nps) / 1000).toFixed(0) + " kn/s";
  if (info.time)
    document.getElementById("time").textContent =
      (parseInt(info.time) / 1000).toFixed(1) + "s";

  if (info.score) {
    let evalText = info.score;
    if (info.score.startsWith("cp")) {
      const cp = parseInt(info.score.split(" ")[1]);
      const evalValue = (cp / 100).toFixed(2);
      evalText = (cp > 0 ? "+" : "") + evalValue;
    } else if (info.score.startsWith("mate")) {
      const mateIn = info.score.split(" ")[1];
      evalText = "M" + mateIn;
    }
    document.getElementById("evaluation").textContent = evalText;
  }

  if (info.pv) {
    const pvMoves = info.pv.split(" ");
    document.getElementById("bestMove").textContent = pvMoves[0] || "-";
    document.getElementById("pvLine").textContent = info.pv;
  }
}

// === Game logic ===
function makeAIMove(move) {
  if (!move || move === "(none)") return;
  const moveObj = game.move({
    from: move.substring(0, 2),
    to: move.substring(2, 4),
    promotion: "q",
  });
  if (moveObj) {
    board.position(game.fen());
    updateStatus();
    startAnalysis();
  }
}

function onDragStart(source, piece) {
  if (game.game_over()) return false;
  if (game.turn() === "b" || piece.startsWith("b")) return false;
}

function onDrop(source, target) {
  const move = game.move({ from: source, to: target, promotion: "q" });
  if (move === null) return "snapback";

  updateStatus();
  startAnalysis();
  setTimeout(getAIMove, 400);
}

function onSnapEnd() {
  board.position(game.fen());
}

function getAIMove() {
  stockfishWorker.postMessage({ type: "getmove", fen: game.fen() });
}

function startAnalysis() {
  stockfishWorker.postMessage({ type: "analyze", fen: game.fen() });
}

function updateEngineStatus(status) {
  document.getElementById("engineStatus").textContent = status;
}

function updateStatus() {
  let status = "";
  const moveColor = game.turn() === "b" ? "Black" : "White";

  if (game.in_checkmate()) {
    status = "Game over, " + moveColor + " is checkmated.";
  } else if (game.in_draw()) {
    status = "Game drawn.";
  } else {
    status = moveColor + " to move";
    if (game.in_check()) status += ", " + moveColor + " is in check";
  }

  document.getElementById("status").textContent = status;

  const history = game.history();
  document.getElementById("moveHistory").textContent = history.join(" ");
}

// === Board configuration ===
const config = {
  draggable: true,
  position: "start",
  onDragStart,
  onDrop,
  onSnapEnd,
};

board = Chessboard("myBoard", config);

// === Buttons ===
document.getElementById("newGameBtn").addEventListener("click", () => {
  game.reset();
  board.start();
  updateStatus();
  startAnalysis();
});

document.getElementById("undoBtn").addEventListener("click", () => {
  game.undo();
  game.undo();
  board.position(game.fen());
  updateStatus();
  startAnalysis();
});

document.getElementById("flipBtn").addEventListener("click", () => {
  board.flip();
});

// === Initialize ===
window.addEventListener("load", () => {
  initStockfish();
  updateStatus();
});
