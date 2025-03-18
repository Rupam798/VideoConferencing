// Polyfill for global object needed by simple-peer
if (typeof window !== "undefined" && !window.global) {
  window.global = window;
}
