// stockfish-worker.js

// Загружаем движок Stockfish из CDN
importScripts("https://cdn.jsdelivr.net/npm/stockfish/src/stockfish.wasm.js");


let engine = null;
let ready = false;

// Инициализация Stockfish WASM
Stockfish().then(function(sf) {
  engine = sf;
  
  // Обработчик сообщений от движка
  engine.addMessageListener(function(message) {
    if (message === 'uciok') {
      ready = true;
      self.postMessage({ type: 'ready' });
    } else if (typeof message === 'string') {
      if (message.startsWith('bestmove')) {
        const parts = message.split(' ');
        self.postMessage({ type: 'bestmove', bestmove: parts[1] });
      } else if (message.startsWith('info')) {
        const info = parseInfo(message);
        if (Object.keys(info).length > 0) {
          self.postMessage({ type: 'info', info: info });
        }
      }
    }
  });
  
  // Отправляем команду uci для инициализации
  engine.postMessage('uci');
});

// Функция парсинга информации от движка
function parseInfo(line) {
  const info = {};
  
  // Глубина поиска
  const depthMatch = line.match(/depth (\d+)/);
  if (depthMatch) info.depth = depthMatch[1];
  
  // Количество узлов
  const nodesMatch = line.match(/nodes (\d+)/);
  if (nodesMatch) info.nodes = nodesMatch[1];
  
  // Скорость (узлов в секунду)
  const npsMatch = line.match(/nps (\d+)/);
  if (npsMatch) info.nps = npsMatch[1];
  
  // Время
  const timeMatch = line.match(/time (\d+)/);
  if (timeMatch) info.time = timeMatch[1];
  
  // Оценка позиции
  const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
  if (scoreMatch) {
    info.score = scoreMatch[1] + ' ' + scoreMatch[2];
  }
  
  // Главная вариация (PV)
  const pvMatch = line.match(/pv (.+)/);
  if (pvMatch) info.pv = pvMatch[1];
  
  return info;
}

// Обработчик сообщений от главного потока
self.onmessage = function(event) {
  if (!engine || !ready) return;
  
  const { type, fen } = event.data;
  
  if (type === 'init') {
    engine.postMessage('setoption name Skill Level value 20');
    engine.postMessage('setoption name MultiPV value 1');
    engine.postMessage('isready');
  } else if (type === 'analyze') {
    engine.postMessage('stop');
    engine.postMessage('position fen ' + fen);
    engine.postMessage('go infinite');
  } else if (type === 'getmove') {
    engine.postMessage('stop');
    engine.postMessage('position fen ' + fen);
    engine.postMessage('go movetime 1500');
  }
};
