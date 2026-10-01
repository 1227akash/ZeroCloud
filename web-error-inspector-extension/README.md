# Web Bug & Error Inspector (Chrome Extension MV3)

An all-in-one developer browser extension that combines runtime error sniffer, dead link detection, accessibility audits, Web Vitals, and CSS layout wireframing into a single lightweight tool.

---

## 🚀 How to Install in Chrome / Edge / Brave (10 Seconds)

1. Open your browser and navigate to:
   ```text
   chrome://extensions
   ```
   *(or `edge://extensions` if using Microsoft Edge)*

2. Toggle **Developer mode** on (switch is in the top right corner).

3. Click the **Load unpacked** button in the top left.

4. Select the `web-error-inspector-extension` directory located inside this repository.

5. Pin the extension to your toolbar. You're done! 🎉

---

## 🛠️ Features Included

| Feature | Description | Inspired By |
|---|---|---|
| **🔴 Runtime Error & Console Sniffer** | Detects unhandled exceptions, promise rejections, console.errors, and 404 assets in real-time with an active badge counter on the extension icon. | *JavaScript Errors Notifier* |
| **🔗 Broken Link & Asset Scanner** | One-click page scanner that checks links, images, and resources for 404s and network timeouts. | *Check My Links* |
| **♿ Accessibility & DOM Auditor** | Flags missing image `alt` tags, unlabeled inputs, empty buttons, broken headings, and duplicate IDs. | *axe DevTools / WAVE* |
| **📐 Pesticide CSS Wireframe Tool** | 1-click toggle to outline all HTML elements with distinct colored bounding boxes to reveal overflow and layout bugs. | *Pesticide* |
| **⚡ Core Web Vitals Snapshot** | Live reporting of CLS (Cumulative Layout Shift), LCP, TTFB, and DOM Ready times. | *Web Vitals* |
| **📋 1-Click Markdown Export** | Generates a clean markdown report of all detected bugs and copies it directly to your clipboard for GitHub / Jira issues. | *Bug Reporting Tools* |
