// Injected script - Runs in MAIN world to capture native JS errors and console output
(function () {
  if (window.__web_inspector_injected) return;
  window.__web_inspector_injected = true;

  function dispatchInspectorLog(data) {
    try {
      window.dispatchEvent(
        new CustomEvent("__WEB_INSPECTOR_LOG__", {
          detail: {
            id: Math.random().toString(36).substring(2, 9),
            timestamp: new Date().toLocaleTimeString(),
            url: window.location.href,
            ...data
          }
        })
      );
    } catch (e) {
      // Safe guard against recursive errors
    }
  }

  // 1. Uncaught JavaScript Exceptions & Resource Failures
  window.addEventListener(
    "error",
    function (event) {
      if (event.target && (event.target.tagName === "IMG" || event.target.tagName === "SCRIPT" || event.target.tagName === "LINK")) {
        const src = event.target.src || event.target.href || "Unknown source";
        dispatchInspectorLog({
          category: "resource",
          level: "error",
          title: `Failed to load ${event.target.tagName.toLowerCase()} resource`,
          message: `Resource failed: ${src}`,
          element: `<${event.target.tagName.toLowerCase()}>`,
          source: src
        });
        return;
      }

      dispatchInspectorLog({
        category: "runtime",
        level: "error",
        title: event.message || "Uncaught JavaScript Exception",
        message: event.message || "Unknown error",
        filename: event.filename || "inline",
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error && event.error.stack ? event.error.stack : null
      });
    },
    true // Capture phase for resource errors
  );

  // 2. Unhandled Promise Rejections
  window.addEventListener("unhandledrejection", function (event) {
    const reason = event.reason;
    const msg = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : null;

    dispatchInspectorLog({
      category: "promise",
      level: "error",
      title: "Unhandled Promise Rejection",
      message: msg || "Promise rejected without reason",
      stack: stack
    });
  });

  // 3. Intercept console.error and console.warn
  const originalError = console.error;
  console.error = function (...args) {
    try {
      const message = args
        .map((arg) => (typeof arg === "object" ? JSON.stringify(arg, null, 1) : String(arg)))
        .join(" ");
      dispatchInspectorLog({
        category: "console",
        level: "error",
        title: "Console Error",
        message: message,
        stack: new Error().stack
      });
    } catch (_) {}
    originalError.apply(console, args);
  };

  const originalWarn = console.warn;
  console.warn = function (...args) {
    try {
      const message = args
        .map((arg) => (typeof arg === "object" ? JSON.stringify(arg, null, 1) : String(arg)))
        .join(" ");
      dispatchInspectorLog({
        category: "console",
        level: "warning",
        title: "Console Warning",
        message: message
      });
    } catch (_) {}
    originalWarn.apply(console, args);
  };
})();
