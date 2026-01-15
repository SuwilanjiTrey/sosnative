package com.trey_chellah.SOS

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class ShakeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val receiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val message = intent?.getStringExtra(ShakeService.EXTRA_MESSAGE) ?: return
            sendEventToJS(message)
        }
    }

    init {
        val filter = IntentFilter(ShakeService.ACTION_SHAKE_EVENT)
        reactContext.registerReceiver(receiver, filter)
    }

    override fun getName(): String = "ShakeModule"

    @ReactMethod
    fun startService() {
        val intent = Intent(reactContext, ShakeService::class.java)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            reactContext.startForegroundService(intent)
        } else {
            reactContext.startService(intent)
        }
    }

    @ReactMethod
    fun stopService() {
        val intent = Intent(reactContext, ShakeService::class.java)
        reactContext.stopService(intent)
    }

    private fun sendEventToJS(message: String) {
        val params = Arguments.createMap()
        params.putString("message", message)

        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("ShakeDetected", params)
    }

    override fun invalidate() {
        reactContext.unregisterReceiver(receiver)
        super.invalidate()
    }
}
