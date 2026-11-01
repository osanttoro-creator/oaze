package site.oaze.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;

/* Widget da tela inicial: saldo (ou "oculto"), próximos vencimentos e
   dois botões — abrir o app e lançar. */
public class OazeWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context contexto, AppWidgetManager gerente, int[] ids) {
        desenhar(contexto, gerente, ids);
    }

    private static PendingIntent abrir(Context contexto, String acao, int codigo) {
        Intent intent;
        if (acao == null) {
            intent = new Intent(contexto, MainActivity.class);
        } else {
            intent = new Intent(Intent.ACTION_VIEW, Uri.parse("oaze://acao/" + acao));
            intent.setPackage(contexto.getPackageName());
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(contexto, codigo, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void texto(RemoteViews vista, int id, String valor) {
        vista.setTextViewText(id, valor);
        vista.setViewVisibility(id, valor == null || valor.isEmpty() ? View.GONE : View.VISIBLE);
    }

    static void desenhar(Context contexto, AppWidgetManager gerente, int[] ids) {
        SharedPreferences dados = contexto.getSharedPreferences(OazeWidgetPlugin.PREFS, Context.MODE_PRIVATE);
        String titulo = dados.getString("titulo", "");
        for (int id : ids) {
            RemoteViews vista = new RemoteViews(contexto.getPackageName(), R.layout.oaze_widget);
            if (titulo == null || titulo.isEmpty()) {
                texto(vista, R.id.oaze_widget_titulo, "OAZE");
                texto(vista, R.id.oaze_widget_destaque, "");
                texto(vista, R.id.oaze_widget_linha1, "Abra o app para preparar o widget.");
                texto(vista, R.id.oaze_widget_linha2, "");
                texto(vista, R.id.oaze_widget_linha3, "");
                texto(vista, R.id.oaze_widget_rodape, "");
            } else {
                texto(vista, R.id.oaze_widget_titulo, titulo);
                texto(vista, R.id.oaze_widget_destaque, dados.getString("destaque", ""));
                texto(vista, R.id.oaze_widget_linha1, dados.getString("linha1", ""));
                texto(vista, R.id.oaze_widget_linha2, dados.getString("linha2", ""));
                texto(vista, R.id.oaze_widget_linha3, dados.getString("linha3", ""));
                texto(vista, R.id.oaze_widget_rodape, dados.getString("rodape", ""));
            }
            vista.setOnClickPendingIntent(R.id.oaze_widget_raiz, abrir(contexto, null, 7100));
            vista.setOnClickPendingIntent(R.id.oaze_widget_novo, abrir(contexto, "novo", 7101));
            gerente.updateAppWidget(id, vista);
        }
    }
}
