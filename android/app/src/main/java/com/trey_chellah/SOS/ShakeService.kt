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
import android.widget.TextView
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

    private val shakeDetector = SmartShakeDetector()
    private val readings = mutableListOf<SmartShakeDetector.ShakeReading>()
    private lateinit var sensorManager: SensorManager
    private var accel = 0f
    private var accelCurrent = 0f
    private var accelLast = 0f
    private var popupShown = false
    private var lastTriggerTime: Long = 0
    private val COOLDOWN_MS = 60 * 60 * 1000 // 1 hour

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

        // Store reading for pattern analysis
        readings.add(SmartShakeDetector.ShakeReading(
            timestamp = System.currentTimeMillis(),
            acceleration = accel,
            x = x, y = y, z = z
        ))
        
        // Keep only recent history
        if (readings.size > 50) {
            readings.removeAt(0)
        }

        // First check: is there significant movement?
        if (accel > 12f && !popupShown) {
            // Second check: analyze the pattern
            val likelihood = shakeDetector.analyzeShakePattern(readings)
            
            when (likelihood) {
                SmartShakeDetector.EmergencyLikelihood.HIGH -> {
                    // Definitely looks like an emergency
                    checkCooldownAndTrigger("High confidence emergency detected")
                }
                SmartShakeDetector.EmergencyLikelihood.MEDIUM -> {
                    // Maybe an emergency - you could show a less intrusive notification
                    // or require user confirmation
                    Log.d("ShakeService", "Possible emergency detected")
                    broadcastToModule("Possible emergency - monitoring")
                }
                SmartShakeDetector.EmergencyLikelihood.UNLIKELY -> {
                    // Probably just normal activity
                    Log.d("ShakeService", "Normal activity detected, ignoring")
                }
            }
        }
    }
    
    private fun checkCooldownAndTrigger(message: String) {
        val now = System.currentTimeMillis()
        
        if (now - lastTriggerTime < COOLDOWN_MS) {
            Log.d("ShakeService", "Shake ignored (cooldown active)")
            broadcastToModule("Shake ignored: cooldown active")
            return
        }
        
        lastTriggerTime = now
        Log.d("ShakeService", message)
        broadcastToModule(message)
        showShakePopup()
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
        overlayView = inflater.inflate(R.layout.shake_widget, null)

        overlayView?.findViewById<TextView>(R.id.btnOpenApp)?.setOnClickListener {
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
            launchIntent?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            startActivity(launchIntent)
            broadcastToModule("Widget clicked → Opening app")
            removeOverlay()
        }

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

class SmartShakeDetector {
    data class ShakeReading(
        val timestamp: Long,
        val acceleration: Float,
        val x: Float,
        val y: Float,
        val z: Float
    )
    
    fun analyzeShakePattern(readings: List<ShakeReading>): EmergencyLikelihood {
        if (readings.size < 10) return EmergencyLikelihood.UNLIKELY
        
        val isPersistent = checkPersistence(readings)
        val isErratic = checkErraticPattern(readings)
        val hasHighPeaks = checkPeakIntensity(readings)
        val hasLowFrequency = checkFrequency(readings)
        
        val score = calculateEmergencyScore(
            isPersistent, isErratic, hasHighPeaks, hasLowFrequency
        )
        
        return when {
            score > 0.7 -> EmergencyLikelihood.HIGH
            score > 0.4 -> EmergencyLikelihood.MEDIUM
            else -> EmergencyLikelihood.UNLIKELY
        }
    }
    
    private fun checkPersistence(readings: List<ShakeReading>): Boolean {
        val threshold = 15f
        val sustainedCount = readings.count { it.acceleration > threshold }
        return sustainedCount > readings.size * 0.4
    }
    
    private fun checkErraticPattern(readings: List<ShakeReading>): Boolean {
        val peaks = findPeaks(readings)
        if (peaks.size < 3) return false
        
        val intervals = mutableListOf<Long>()
        for (i in 1 until peaks.size) {
            intervals.add(peaks[i].timestamp - peaks[i-1].timestamp)
        }
        
        val variance = calculateVariance(intervals)
        return variance > 100
    }
    
    private fun checkPeakIntensity(readings: List<ShakeReading>): Boolean {
        val maxAccel = readings.maxOfOrNull { it.acceleration } ?: 0f
        return maxAccel > 25f
    }
    
    private fun checkFrequency(readings: List<ShakeReading>): Boolean {
        val peaks = findPeaks(readings)
        if (peaks.size < 2) return false
        
        val timeSpan = peaks.last().timestamp - peaks.first().timestamp
        val frequency = (peaks.size - 1) * 1000f / timeSpan
        
        return frequency < 0.5f || frequency > 4f
    }
    
    private fun findPeaks(readings: List<ShakeReading>): List<ShakeReading> {
        val peaks = mutableListOf<ShakeReading>()
        for (i in 1 until readings.size - 1) {
            if (readings[i].acceleration > readings[i-1].acceleration &&
                readings[i].acceleration > readings[i+1].acceleration &&
                readings[i].acceleration > 12f) {
                peaks.add(readings[i])
            }
        }
        return peaks
    }
    
    private fun calculateVariance(values: List<Long>): Double {
        if (values.isEmpty()) return 0.0
        val mean = values.average()
        return values.map { (it - mean) * (it - mean) }.average()
    }
    
    private fun calculateEmergencyScore(
        persistent: Boolean,
        erratic: Boolean,
        highPeaks: Boolean,
        lowFreq: Boolean
    ): Float {
        var score = 0f
        if (persistent) score += 0.3f
        if (erratic) score += 0.3f
        if (highPeaks) score += 0.25f
        if (lowFreq) score += 0.15f
        return score
    }
    
    enum class EmergencyLikelihood {
        UNLIKELY, MEDIUM, HIGH
    }
}
