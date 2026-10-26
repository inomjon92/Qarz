package uz.qarzdaftari.app;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.os.Build;
import android.telephony.SmsManager;
import android.telephony.SubscriptionManager;
import androidx.core.content.ContextCompat;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONArray;
import org.json.JSONObject;

/** Fetches pending SMS from the server, sends each via the SIM, and reports the result. */
public class SmsWorker extends Worker {
    public SmsWorker(@NonNull Context ctx, @NonNull WorkerParameters params) {
        super(ctx, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        runOnce(getApplicationContext());
        return Result.success();
    }

    static synchronized void runOnce(Context ctx) {
        SharedPreferences p = SmsGatewayPlugin.prefs(ctx);
        if (!p.getBoolean("enabled", false)) return;
        String base = p.getString("apiBase", "");
        String token = p.getString("token", "");
        String error = null;
        int sent = 0;
        try {
            JSONArray items = new JSONArray(http("GET", base + "/api/sms/pending", token, null));
            SmsManager sms = smsManager(ctx);
            for (int i = 0; i < items.length(); i++) {
                JSONObject m = items.getJSONObject(i);
                JSONObject result = new JSONObject();
                String failure;
                try {
                    failure = sendAndWait(ctx, sms, m.getString("phone"), m.getString("text"));
                } catch (Exception e) {
                    failure = String.valueOf(e.getMessage());
                }
                result.put("ok", failure == null);
                if (failure == null) sent++;
                else result.put("error", failure);
                http("POST", base + "/api/sms/" + m.getString("id") + "/result", token, result.toString());
                Thread.sleep(2000); // keep a gap so the operator does not throttle us
            }
        } catch (Exception e) {
            error = e.getMessage();
        }
        p.edit()
            .putLong("lastRun", System.currentTimeMillis())
            .putString("lastError", error)
            .putInt("sentTotal", p.getInt("sentTotal", 0) + sent)
            .apply();
    }

    // Uses the phone's default SMS SIM; on dual-SIM phones set to "ask every time" falls back to the first SIM.
    @SuppressWarnings("deprecation")
    private static SmsManager smsManager(Context ctx) {
        int sub = SubscriptionManager.getDefaultSmsSubscriptionId();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            SmsManager base = ctx.getSystemService(SmsManager.class);
            return sub != SubscriptionManager.INVALID_SUBSCRIPTION_ID ? base.createForSubscriptionId(sub) : base;
        }
        return sub != SubscriptionManager.INVALID_SUBSCRIPTION_ID ? SmsManager.getSmsManagerForSubscriptionId(sub) : SmsManager.getDefault();
    }

    /** Sends one SMS and waits for the radio's verdict. Returns null on success or a readable reason. */
    private static String sendAndWait(Context ctx, SmsManager sms, String phone, String text) throws Exception {
        ArrayList<String> parts = sms.divideMessage(text);
        String action = ctx.getPackageName() + ".SMS_SENT." + System.nanoTime();
        CountDownLatch latch = new CountDownLatch(parts.size());
        AtomicReference<String> failure = new AtomicReference<>(null);
        BroadcastReceiver receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context c, Intent intent) {
                int code = getResultCode();
                if (code != Activity.RESULT_OK) failure.compareAndSet(null, describe(code));
                latch.countDown();
            }
        };
        ContextCompat.registerReceiver(ctx, receiver, new IntentFilter(action), ContextCompat.RECEIVER_NOT_EXPORTED);
        try {
            ArrayList<PendingIntent> sentIntents = new ArrayList<>();
            for (int i = 0; i < parts.size(); i++) {
                Intent intent = new Intent(action).setPackage(ctx.getPackageName());
                sentIntents.add(PendingIntent.getBroadcast(ctx, i, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
            }
            sms.sendMultipartTextMessage(phone, null, parts, sentIntents, null);
            if (!latch.await(60, TimeUnit.SECONDS)) return "Telefon javob bermadi (60 soniya)";
            return failure.get();
        } finally {
            ctx.unregisterReceiver(receiver);
        }
    }

    private static String describe(int code) {
        switch (code) {
            case SmsManager.RESULT_ERROR_RADIO_OFF: return "SIM o'chiq yoki samolyot rejimi";
            case SmsManager.RESULT_ERROR_NO_SERVICE: return "Aloqa yo'q (signal)";
            case SmsManager.RESULT_ERROR_NULL_PDU: return "SMS matnida xato";
            case SmsManager.RESULT_ERROR_LIMIT_EXCEEDED: return "Android SMS limiti oshdi, keyinroq qayta urinadi";
            case SmsManager.RESULT_ERROR_SHORT_CODE_NOT_ALLOWED:
            case SmsManager.RESULT_ERROR_SHORT_CODE_NEVER_ALLOWED: return "Bu raqamga SMS yuborish taqiqlangan";
            case SmsManager.RESULT_ERROR_GENERIC_FAILURE: return "Operator rad etdi (balans yoki SMS paketini tekshiring)";
            default: return "SMS yuborilmadi (kod " + code + ")";
        }
    }

    private static String http(String method, String url, String token, String body) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setRequestMethod(method);
        c.setConnectTimeout(20000);
        c.setReadTimeout(30000);
        c.setRequestProperty("Authorization", "Bearer " + token);
        c.setRequestProperty("Content-Type", "application/json");
        if (body != null) {
            c.setDoOutput(true);
            try (OutputStream os = c.getOutputStream()) {
                os.write(body.getBytes(StandardCharsets.UTF_8));
            }
        }
        int code = c.getResponseCode();
        if (code == 401) throw new Exception("Sessiya tugagan, ilovaga qayta kiring");
        if (code >= 400) throw new Exception("Server xatosi: " + code);
        StringBuilder sb = new StringBuilder();
        try (BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = r.readLine()) != null) sb.append(line);
        }
        return sb.toString();
    }
}
