package com.example

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.example.ui.theme.MyApplicationTheme

class MainActivity : ComponentActivity() {
    private var webView: WebView? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Keep screen on during gameplay
        window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // Setup immersive full-screen
        setImmersiveFullScreen()

        setContent {
            MyApplicationTheme {
                Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
                    GameWebView(
                        modifier = Modifier.fillMaxSize(),
                        onWebViewCreated = { createdWebView ->
                            webView = createdWebView
                        }
                    )
                }
            }
        }

        // Register back pressed callback to go back in WebView or handle navigation gracefully
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                webView?.let { view ->
                    // Trigger custom back function inside JS
                    view.evaluateJavascript(
                        "if (window.ui && window.ui.activeScreen !== 'home-screen') { " +
                        "    document.querySelector('#' + window.ui.activeScreen + ' .btn-back').click(); " +
                        "} else { " +
                        "    false; " +
                        "}", 
                        { result ->
                            // If we didn't handle it in JS (it returned "false" or is home screen), trigger standard finish
                            if (result == "false" || result == "null") {
                                finish()
                            }
                        }
                    )
                } ?: finish()
            }
        })
    }

    override fun onResume() {
        super.onResume()
        // Re-apply full screen immersive flags
        setImmersiveFullScreen()
    }

    private fun setImmersiveFullScreen() {
        try {
            // Modern standard implementation (API 30+)
            val controller = WindowCompat.getInsetsController(window, window.decorView)
            controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            controller.hide(WindowInsetsCompat.Type.systemBars())
        } catch (e: Exception) {
            // Fallback to legacy implementation in case of any issues
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
            )
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun GameWebView(
    modifier: Modifier = Modifier,
    onWebViewCreated: (WebView) -> Unit
) {
    AndroidView(
        modifier = modifier,
        factory = { context ->
            WebView(context).apply {
                // Enable remote debugging of WebView contents via Chrome DevTools
                WebView.setWebContentsDebuggingEnabled(true)

                // Configure webview settings for game loading and speed
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.databaseEnabled = true
                settings.allowFileAccess = true
                settings.allowContentAccess = true
                
                // Allow file loading and universal access (essential for modern Android WebView file URLs)
                @Suppress("DEPRECATION")
                settings.allowFileAccessFromFileURLs = true
                @Suppress("DEPRECATION")
                settings.allowUniversalAccessFromFileURLs = true

                // Keep scale responsive and disable zoom controls for native feel
                settings.useWideViewPort = true
                settings.loadWithOverviewMode = true
                settings.setSupportZoom(false)
                settings.builtInZoomControls = false
                settings.displayZoomControls = false

                // Scrollbar style
                isScrollbarFadingEnabled = true
                scrollBarStyle = View.SCROLLBARS_INSIDE_OVERLAY

                webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                        return false // Let WebView load it locally
                    }
                }

                webChromeClient = object : WebChromeClient() {
                    override fun onConsoleMessage(consoleMessage: android.webkit.ConsoleMessage?): Boolean {
                        consoleMessage?.let {
                            android.util.Log.d("WebViewConsole", "${it.message()} -- From line ${it.lineNumber()} of ${it.sourceId()}")
                        }
                        return super.onConsoleMessage(consoleMessage)
                    }
                }

                // Load local assets game files
                loadUrl("file:///android_asset/www/index.html")
                onWebViewCreated(this)
            }
        }
    )
}
