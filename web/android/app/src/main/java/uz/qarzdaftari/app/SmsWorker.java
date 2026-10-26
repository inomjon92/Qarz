package uz.qarzdaftari.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.telephony.SmsManager;
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
                try {
                    ArrayList<String> parts = sms.divideMessage(m.getString("text"));
                    sms.sendMultipartTextMessage(m.getString("phone"), null, parts, null, null);
                    result.put("ok", true);
                    sent++;
                } catch (Exception e) {
                    result.put("ok", false);
                    result.put("error", String.valueOf(e.getMessage()));
                }
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

    private static SmsManager smsManager(Context ctx) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) return ctx.getSystemService(SmsManager.class);
        return SmsManager.getDefault();
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
