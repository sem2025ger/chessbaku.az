let board = null;
let game = new Chess();
let engine = null;

// Стартуем Web Worker
engine = new Worker("stockfish-worker.js");

// Флаг готовности
let engineReady = false;

// Когда движок присылает ответ
engine.onmessage = function (event) {
    const msg = event.data;

    if (typeof msg === "string") {
        if (msg.includes("Stockfish 16")) {
            engineReady = true;
            console.log("Engine ready!");
            document.getElementById("engineStatus").innerText = "Engine ready!";
        }

        if (msg.startsWith("bestmove")) {
            const best = msg.split(" ")[1];
            document.getElementById("bestmove").innerHTML = best;
        }

        if (msg.includes("score cp")) {
            const val = msg.split("score cp ")[1].split(" ")[0];
            const evalFloat = (parseInt(val) / 100).toFixed(2);
            document.getElementById("eval").innerHTML = evalFloat;
        }
    }
};

// Послать команду движку
function send(cmd) {
    if (!engineReady) {
        console.warn("Engine not ready");
        return;
    }
    engine.postMessage(cmd);
}

// Инициализация доски
function initBoard() {
    board = Chessboard("board", {
        draggable: true,
        dropOffBoard: "snapback",
        position: "start",
        onDrop: onDrop
    });
}

function onDrop(source, target) {
    let move = game.move({
        from: source,
        to: target,
        promotion: "q"
    });

    if (move === null) return "snapback";

    updateStatus();
    analyzePosition();
}

// Запрос анализа позиции
function analyzePosition() {
    if (!engineReady) return;

    send("position fen " + game.fen());
    send("go depth 15");
}

function updateStatus() {
    document.getElementById("status").innerText =
        game.turn() === "w" ? "White to move" : "Black to move";

    document.getElementById("moveHistory").innerText =
        game.history().join(" ");
}

// Новая партия
document.getElementById("newGameBtn").onclick = () => {
    game.reset();
    board.start();
    updateStatus();
    analyzePosition();
};

// Отменить ход
document.getElementById("undoBtn").onclick = () => {
    game.undo();
    board.position(game.fen());
    updateStatus();
};

// Перевернуть доску
document.getElementById("flipBtn").onclick = () => {
    board.flip();
};

// Запуск
window.onload = () => {
    initBoard();
    updateStatus();
};
