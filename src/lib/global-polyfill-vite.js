// This file will be loaded by Vite before any other modules
// It ensures the global object is available for libraries like simple-peer
window.global = window;

// Other globals that might be needed by Node.js modules
window.process = window.process || { env: {} };
window.Buffer = window.Buffer || require("buffer/").Buffer;
