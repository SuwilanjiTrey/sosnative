package com.trey_chellah.SOS

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import android.util.Log

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query

class SOSWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        Log.d("SOSWidget", "Widget enabled")
    }

    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        Log.d("SOSWidget", "Widget disabled")
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        when (intent.action) {
            ACTION_SOS_CLICKED -> {
                Log.d("SOSWidget", "SOS button clicked")
                handleSOSClick(context)
            }
            ACTION_COMPASS_CLICKED -> {
                Log.d("SOSWidget", "Compass clicked")
                handleCompassClick(context)
            }
            ACTION_UPDATE_LOCATION -> {
                Log.d("SOSWidget", "Updating location")
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(
                    android.content.ComponentName(context, SOSWidget::class.java)
                )
                for (appWidgetId in appWidgetIds) {
                    updateAppWidget(context, appWidgetManager, appWidgetId)
                }
            }
        }
    }

    private fun handleSOSClick(context: Context) {
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        launchIntent?.apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            putExtra("TRIGGER_SOS", true)
            context.startActivity(this)
        }
    }

    private fun handleCompassClick(context: Context) {
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        launchIntent?.apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            putExtra("OPEN_COMPASS", true)
            context.startActivity(this)
        }
    }

    companion object {
        private const val ACTION_SOS_CLICKED = "com.trey_chellah.SOS.SOS_CLICKED"
        private const val ACTION_COMPASS_CLICKED = "com.trey_chellah.SOS.COMPASS_CLICKED"
        private const val ACTION_UPDATE_LOCATION = "com.trey_chellah.SOS.UPDATE_LOCATION"

        internal fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val views = RemoteViews(context.packageName, R.layout.sos_widget_layout)

            val sosIntent = Intent(context, SOSWidget::class.java).apply {
                action = ACTION_SOS_CLICKED
            }
            val sosPendingIntent = PendingIntent.getBroadcast(
                context, 0, sosIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.sos_button, sosPendingIntent)

            val compassIntent = Intent(context, SOSWidget::class.java).apply {
                action = ACTION_COMPASS_CLICKED
            }
            val compassPendingIntent = PendingIntent.getBroadcast(
                context, 1, compassIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.compass_container, compassPendingIntent)

            fetchLocationFromFirebase(context, views, appWidgetManager, appWidgetId)
        }

        private fun fetchLocationFromFirebase(
            context: Context,
            views: RemoteViews,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val auth = FirebaseAuth.getInstance()
            val currentUser = auth.currentUser

            if (currentUser != null) {
                val db = FirebaseFirestore.getInstance()

                db.collection("recorded_locations")
                    .whereEqualTo("userId", currentUser.uid)
                    .orderBy("timestamp", Query.Direction.DESCENDING)
                    .limit(1)
                    .addSnapshotListener { snapshot, error ->
                        if (error != null) {
                            Log.e("SOSWidget", "Error fetching location", error)
                            views.setTextViewText(R.id.location_text, "Location unavailable")
                            appWidgetManager.updateAppWidget(appWidgetId, views)
                            return@addSnapshotListener
                        }

                        if (snapshot != null && !snapshot.isEmpty) {
                            val locationDoc = snapshot.documents[0]
                            val latitude = locationDoc.getDouble("latitude")
                            val longitude = locationDoc.getDouble("longitude")

                            if (latitude != null && longitude != null) {
                                val locationText = getCityFromCoordinates(context, latitude!!, longitude!!)
                                views.setTextViewText(R.id.location_text, locationText)
                                Log.d("SOSWidget", "Location updated: $locationText")
                            } else {
                                views.setTextViewText(R.id.location_text, "Location unavailable")
                            }
                        } else {
                            views.setTextViewText(R.id.location_text, "Location unavailable")
                        }

                        appWidgetManager.updateAppWidget(appWidgetId, views)
                    }
            } else {
                views.setTextViewText(R.id.location_text, "Not logged in")
                appWidgetManager.updateAppWidget(appWidgetId, views)
            }
        }

        private fun getCityFromCoordinates(context: Context, latitude: Double, longitude: Double): String {
            return try {
                val geocoder = android.location.Geocoder(context, java.util.Locale.getDefault())
                val addresses = geocoder.getFromLocation(latitude, longitude, 1)

                if (!addresses.isNullOrEmpty()) {
                    val address = addresses[0]
                    address.locality ?: address.subAdminArea ?: address.adminArea ?:
                    "${latitude.toString().take(6)}, ${longitude.toString().take(6)}"
                } else {
                    "${latitude.toString().take(6)}, ${longitude.toString().take(6)}"
                }
            } catch (e: Exception) {
                Log.e("SOSWidget", "Geocoding error", e)
                "${latitude.toString().take(6)}, ${longitude.toString().take(6)}"
            }
        }
    }
}
