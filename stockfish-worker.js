// stockfish-worker.js

// ВАЖНО: Stockfish 16+ требует подгрузки .wasm файла. 
// При загрузке через importScripts с CDN путь к .wasm часто ломается.
// Для максимальной надежности через CDN лучше использовать 
// asm.js версию (например, v10) или специально собранную single-file версию.
// Если нужен именно SF 16, лучше хостить файлы локально.

const CDN_URLS = [
  // Попробуем загрузить, но учтите проблему с WASM, описанную выше.
  // Часто лучше использовать проверенную версию 10 для веб-интерфейсов без сложной настройки:
  "https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.0/stockfish.js", 
  "https://cdn.jsdelivr.net/npm/stockfish@16.1.0/src/stockfish.js", // Может требовать WASM
];

let engine = null;
let loaded = false;

// 1) Пытаемся загрузить скрипт
for (const url of CDN_URLS) {
  try {
    importScripts(url);
    
    // Проверяем, появилась ли глобальная функция
    if (typeof Stockfish === 'function') {
      loaded = true;
      console.log(`Stockfish loaded from ${url}`);
      break;
    } else {
        // Скрипт загрузился, но это не то (например, ES module)
        console.warn(`Script loaded from ${url} but Stockfish global not found.`);
    }
  } catch (e) {
    console.warn(`Failed to load from ${url}:`, e);
  }
}

// 2) Если не загрузилось
if (!loaded || typeof Stockfish !== 'function') {
  const errorMsg = "Stockfish failed to load from all CDNs";
  postMessage(`error: ${errorMsg}`);
  throw new Error(errorMsg);
}

// 3) Инициализация
// В старых версиях (v10) это синхронно. В новых (WASM) может возвращать Promise.
// Обработаем оба варианта.
try {
    const instance = Stockfish();

    // Проверка на Promise (для WASM версий)
    if (instance instanceof Promise || (instance && typeof instance.then === 'function')) {
        instance.then(initEngine).catch(err => {
             postMessage(`error: Engine initialization failed: ${err}`);
        });
    } else {
        // Синхронная версия
        initEngine(instance);
    }

} catch (e) {
    postMessage(`error: Error creating Stockfish instance: ${e.message}`);
}

// Функция настройки слушателей движка
function initEngine(engineInstance) {
    engine = engineInstance;

    // 4) Обработка сообщений ОТ движка
    engine.onmessage = function (msg) {
        // msg может быть строкой или событием в зависимости от версии
        const output = (typeof msg === 'object' && msg.data) ? msg.data : msg;
        postMessage(output);
    };

    // Сообщаем главному потоку, что мы готовы (опционально, но полезно)
    postMessage("uciok"); // Или просто сигнал готовности
}

// 5) Обработка сообщений ИЗ main thread
onmessage = function (event) {
    if (!engine) {
        console.warn("Engine not ready yet, ignoring message:", event.data);
        return;
    }
    engine.postMessage(event.data);
};
