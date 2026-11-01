package site.oaze.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.widget.RemoteViews;

/* Widget de atalhos (4x1): Despesa, Receita, Recibo e Coco. Não mostra
   nenhum dado financeiro, então funciona mesmo com o app bloqueado. */
public class OazeAtalhosWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context contexto, AppWidgetManager gerente, int[] ids) {
        for (int id : ids) {
            RemoteViews v = new RemoteViews(contexto.getPackageName(), R.layout.oaze_widget_atalhos);
            v.setOnClickPendingIntent(R.id.oaze_atalho_despesa, OazeWidgetProvider.acao(contexto, "novo", 7201));
            v.setOnClickPendingIntent(R.id.oaze_atalho_receita, OazeWidgetProvider.acao(contexto, "receita", 7202));
            v.setOnClickPendingIntent(R.id.oaze_atalho_recibo, OazeWidgetProvider.acao(contexto, "recibo", 7203));
            v.setOnClickPendingIntent(R.id.oaze_atalho_coco, OazeWidgetProvider.acao(contexto, "coco", 7204));
            gerente.updateAppWidget(id, v);
        }
    }
}
