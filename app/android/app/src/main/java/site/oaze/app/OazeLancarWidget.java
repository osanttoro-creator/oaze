package site.oaze.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.widget.RemoteViews;

/* Widget 1x1: um toque abre o formulário de nova despesa. */
public class OazeLancarWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context contexto, AppWidgetManager gerente, int[] ids) {
        for (int id : ids) {
            RemoteViews v = new RemoteViews(contexto.getPackageName(), R.layout.oaze_widget_lancar);
            v.setOnClickPendingIntent(R.id.oaze_lancar_raiz, OazeWidgetProvider.acao(contexto, "novo", 7301));
            gerente.updateAppWidget(id, v);
        }
    }
}
