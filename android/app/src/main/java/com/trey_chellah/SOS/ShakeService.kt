package com.trey_chellah.SOS

import android.app.*
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.os.VibrationEffect
import android.os.Vibrator
import android.provider.Settings
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import androidx.core.app.NotificationCompat
import kotlin.math.sqrt

class ShakeService : Service(), SensorEventListener {

    companion object {
        const val ACTION_SHAKE_EVENT = "com.trey_chellah.SOS.SHAKE_EVENT"
        const val EXTRA_MESSAGE = "message"
    }

    private lateinit var sensorManager: SensorManager
    private var accel = 0f
    private var accelCurrent = 0f
    private var accelLast = 0f
    private var popupShown = false

    private lateinit var windowManager: WindowManager
    private var overlayView: View? = null

    override fun onCreate() {
        super.onCreate()

        sensorManager = getSystemService(SENSOR_SERVICE) as SensorManager
        val accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        sensorManager.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_NORMAL)

        startForeground(1, createNotification())
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

        Log.d("ShakeService", "Service started")
        broadcastToModule("ShakeService started")
    }

    override fun onSensorChanged(event: SensorEvent) {
        val x = event.values[0]
        val y = event.values[1]
        val z = event.values[2]

        accelLast = accelCurrent
        accelCurrent = sqrt((x * x + y * y + z * z).toDouble()).toFloat()
        val delta = accelCurrent - accelLast
        accel = accel * 0.9f + delta

        if (accel > 12 && !popupShown) {
            Log.d("ShakeService", "Shake detected")
            broadcastToModule("Shake detected")
            showShakePopup()
        }
    }

    private fun showShakePopup() {
        popupShown = true

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION)
            intent.data = android.net.Uri.parse("package:$packageName")
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            startActivity(intent)

            broadcastToModule("Overlay permission required")
            popupShown = false
            return
        }

        val inflater = getSystemService(LAYOUT_INFLATER_SERVICE) as LayoutInflater
        overlayView = inflater.inflate(R.layout.shake_popup, null)

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        )

        windowManager.addView(overlayView, params)

        val vibrator = getSystemService(VIBRATOR_SERVICE) as Vibrator
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createOneShot(300, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(300)
        }

        overlayView?.findViewById<Button>(R.id.btnYes)?.setOnClickListener {
            sendSOS()
            removeOverlay()
        }

        overlayView?.findViewById<Button>(R.id.btnNo)?.setOnClickListener {
            removeOverlay()
        }

        overlayView?.postDelayed({ removeOverlay() }, 10000)
    }

    private fun removeOverlay() {
        overlayView?.let {
            windowManager.removeView(it)
            overlayView = null
        }
        popupShown = false
        Log.d("ShakeService", "Popup removed")
    }

    private fun sendSOS() {
        Log.d("ShakeService", "SOS triggered")
        broadcastToModule("SOS triggered")

        val notification = NotificationCompat.Builder(this, "shake_service")
            .setContentTitle("SOS Triggered")
            .setContentText("User requested help!")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .build()

        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(2, notification)
    }

    private fun createNotification(): Notification {
        val channelId = "shake_service"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Shake Detection",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }

        return NotificationCompat.Builder(this, channelId)
            .setContentTitle("Shake Detection Active")
            .setContentText("Detecting shakes...")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .build()
    }

    private fun broadcastToModule(message: String) {
        val intent = Intent(ACTION_SHAKE_EVENT)
        intent.putExtra(EXTRA_MESSAGE, message)
        sendBroadcast(intent)
        Log.d("ShakeService", "Broadcast sent: $message")
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
    override fun onBind(intent: Intent?): IBinder? = null
}
