/**
 * Arrow Escape - Main Orchestrator
 * Bootstraps all game systems and initializes the PWA architecture.
 */

window.addEventListener("DOMContentLoaded", () => {
    // 1. Verify and bind central systems
    try {
        // Initialize UI Layer
        if (window.ui) {
            window.ui.init();
            console.log("Arrow Escape systems loaded successfully.");
        }
    } catch (e) {
        console.error("Critical error during Arrow Escape bootstrap:", e);
    }

    // 2. Register Service Worker for Progressive Web App (PWA) Offline Support
    if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
            navigator.serviceWorker.register("./sw.js")
                .then(reg => {
                    console.log("ServiceWorker registration successful with scope: ", reg.scope);
                })
                .catch(err => {
                    console.warn("ServiceWorker registration failed: ", err);
                });
        });
    }
});
