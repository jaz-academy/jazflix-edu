package com.jazflix.tv;

import android.os.Bundle;
import android.view.KeyEvent;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getBridge() != null && getBridge().getWebView() != null) {
            // Pastikan WebView dapat menerima fokus remote D-Pad TV segera saat aplikasi dibuka
            getBridge().getWebView().setFocusable(true);
            getBridge().getWebView().setFocusableInTouchMode(true);
            getBridge().getWebView().requestFocus();
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
