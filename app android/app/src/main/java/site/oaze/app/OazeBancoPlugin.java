package site.oaze.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.provider.Settings;

import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

/* Ponte JS ↔ fila de avisos do banco (OazeBancoListener). */
@CapacitorPlugin(name = "OazeBanco")
public class OazeBancoPlugin extends Plugin {

    @PluginMethod
    public void status(PluginCall call) {
        Context ctx = getContext();
        boolean ligado = NotificationManagerCompat.getEnabledListenerPackages(ctx).contains(ctx.getPackageName());
        JSObject r = new JSObject();
        r.put("ligado", ligado);
        call.resolve(r);
    }

    @PluginMethod
    public void pendentes(PluginCall call) {
        try {
            SharedPreferences p = getContext().getSharedPreferences(OazeBancoListener.PREFS, Context.MODE_PRIVATE);
            JSObject r = new JSObject();
            r.put("itens", new JSArray(p.getString(OazeBancoListener.CHAVE, "[]")));
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Não consegui ler os avisos.");
        }
    }

    @PluginMethod
    public void remover(PluginCall call) {
        String id = call.getString("id", "");
        try {
            SharedPreferences p = getContext().getSharedPreferences(OazeBancoListener.PREFS, Context.MODE_PRIVATE);
            JSONArray fila = new JSONArray(p.getString(OazeBancoListener.CHAVE, "[]"));
            JSONArray saida = new JSONArray();
            for (int i = 0; i < fila.length(); i++) {
                JSONObject o = fila.getJSONObject(i);
                if (!id.equals(o.optString("id"))) saida.put(o);
            }
            p.edit().putString(OazeBancoListener.CHAVE, saida.toString()).apply();
            call.resolve();
        } catch (Exception e) {
            call.reject("Não consegui remover.");
        }
    }

    @PluginMethod
    public void abrirAjustes(PluginCall call) {
        Intent i = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }
}
