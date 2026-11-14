package com.jazflix.tv;

import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();

            // 1. D-Pad TV Focus
            webView.setFocusable(true);
            webView.setFocusableInTouchMode(true);
            webView.requestFocus();

            // 2. Hardware Acceleration & Performance Optimization untuk Google TV
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

            WebSettings settings = webView.getSettings();
            if (settings != null) {
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setCacheMode(WebSettings.LOAD_DEFAULT);
                settings.setMediaPlaybackRequiresUserGesture(false);
                settings.setUseWideViewPort(true);
                settings.setLoadWithOverviewMode(true);
            }
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        // Tangani tombol Back remote TV agar kembali ke menu/halaman sebelumnya
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (getBridge() != null && getBridge().getWebView() != null && getBridge().getWebView().canGoBack()) {
                getBridge().getWebView().goBack();
                return true;
            }
        }
        return super.onKeyDown(keyCode, event);
    }
}
