package uz.qarzdaftari.app;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.concurrent.TimeUnit;

/**
 * Turns the phone into the shop's SMS sender: a WorkManager job pulls queued
 * messages from the server every 15 minutes and sends them through the SIM.
 */
@CapacitorPlugin(name = "SmsGateway", permissions = { @Permission(alias = "sms", strings = { Manifest.permission.SEND_SMS }) })
public class SmsGatewayPlugin extends Plugin {
    static final String PREFS = "sms_gateway";
    static final String WORK_NAME = "qarz_sms_gateway";

    static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static Constraints constraints() {
        return new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
    }

    private JSObject status() {
        SharedPreferences p = prefs(getContext());
        JSObject o = new JSObject();
        o.put("enabled", p.getBoolean("enabled", false));
        o.put("permission", getPermissionState("sms") == PermissionState.GRANTED);
        long lastRun = p.getLong("lastRun", 0);
        o.put("lastRun", lastRun == 0 ? null : lastRun);
        o.put("lastError", p.getString("lastError", null));
        o.put("sentTotal", p.getInt("sentTotal", 0));
        return o;
    }

    @PluginMethod
    public void status(PluginCall call) {
        call.resolve(status());
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (getPermissionState("sms") == PermissionState.GRANTED) {
            JSObject o = new JSObject();
            o.put("granted", true);
            call.resolve(o);
        } else {
            requestPermissionForAlias("sms", call, "permissionCallback");
        }
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        JSObject o = new JSObject();
        o.put("granted", getPermissionState("sms") == PermissionState.GRANTED);
        call.resolve(o);
    }

    @PluginMethod
    public void enable(PluginCall call) {
        String apiBase = call.getString("apiBase");
        String token = call.getString("token");
        if (apiBase == null || token == null) {
            call.reject("apiBase va token kerak");
            return;
        }
        prefs(getContext()).edit().putString("apiBase", apiBase).putString("token", token).putBoolean("enabled", true).putString("lastError", null).apply();
        PeriodicWorkRequest req = new PeriodicWorkRequest.Builder(SmsWorker.class, 15, TimeUnit.MINUTES).setConstraints(constraints()).build();
        WorkManager wm = WorkManager.getInstance(getContext());
        wm.enqueueUniquePeriodicWork(WORK_NAME, ExistingPeriodicWorkPolicy.UPDATE, req);
        wm.enqueue(new OneTimeWorkRequest.Builder(SmsWorker.class).setConstraints(constraints()).build());
        call.resolve(status());
    }

    @PluginMethod
    public void disable(PluginCall call) {
        prefs(getContext()).edit().putBoolean("enabled", false).apply();
        WorkManager.getInstance(getContext()).cancelUniqueWork(WORK_NAME);
        call.resolve(status());
    }

    @PluginMethod
    public void runNow(PluginCall call) {
        new Thread(() -> {
            SmsWorker.runOnce(getContext());
            call.resolve(status());
        }).start();
    }
}
