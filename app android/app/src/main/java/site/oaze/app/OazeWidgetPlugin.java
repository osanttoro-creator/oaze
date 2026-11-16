package site.oaze.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/*
 * O painel manda um resumo já pronto para exibir (textos curtos). O widget
 * não lê dado financeiro do app nem da rede: mostra só o que recebeu aqui,
 * e o painel decide se valores aparecem ou não (preferência da pessoa).
 */
@CapacitorPlugin(name = "OazeWidget")
public class OazeWidgetPlugin extends Plugin {

    static final String PREFS = "oaze_widget";

    private static String curto(String valor, int max) {
        if (valor == null) return "";
        String limpo = valor.replaceAll("[\\u0000-\\u001f]", " ").trim();
        return limpo.length() > max ? limpo.substring(0, max) : limpo;
    }

    @PluginMethod
    public void atualizar(PluginCall call) {
        Context contexto = getContext();
        SharedPreferences.Editor editor = contexto.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit();
        editor.putString("titulo", curto(call.getString("titulo", "OAZE"), 40));
        editor.putString("destaque", curto(call.getString("destaque", ""), 40));
        editor.putString("linha1", curto(call.getString("linha1", ""), 60));
        editor.putString("linha2", curto(call.getString("linha2", ""), 60));
        editor.putString("linha3", curto(call.getString("linha3", ""), 60));
        editor.putString("rodape", curto(call.getString("rodape", ""), 60));
        editor.apply();
        atualizarTodos(contexto);
        call.resolve(new JSObject());
    }

    @PluginMethod
    public void limpar(PluginCall call) {
        Context contexto = getContext();
        contexto.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply();
        atualizarTodos(contexto);
        call.resolve(new JSObject());
    }

    static void atualizarTodos(Context contexto) {
        AppWidgetManager gerente = AppWidgetManager.getInstance(contexto);
        int[] ids = gerente.getAppWidgetIds(new ComponentName(contexto, OazeWidgetProvider.class));
        if (ids != null && ids.length > 0) OazeWidgetProvider.desenhar(contexto, gerente, ids);
    }
}
