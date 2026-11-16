package site.oaze.app;

import android.content.Intent;
import android.content.pm.ShortcutInfo;
import android.content.pm.ShortcutManager;
import android.graphics.drawable.Icon;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import java.util.Arrays;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin próprio do widget: precisa ser registrado antes do onCreate.
        registerPlugin(OazeWidgetPlugin.class);
        registerPlugin(OazeBancoPlugin.class);
        registerPlugin(OazePlayPlugin.class);
        super.onCreate(savedInstanceState);
        criarAtalhos();
    }

    /*
     * Atalhos ao pressionar e segurar o ícone. Cada um abre oaze://acao/...,
     * o mesmo caminho dos links do app; quem decide o que fazer é o painel.
     */
    private void criarAtalhos() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N_MR1) return;
        try {
            ShortcutManager gerente = getSystemService(ShortcutManager.class);
            if (gerente == null) return;
            gerente.setDynamicShortcuts(Arrays.asList(
                atalho("novo", "Novo lançamento", "Lançar"),
                atalho("recibo", "Foto do recibo", "Recibo"),
                atalho("coco", "Perguntar à Coco", "Coco")
            ));
        } catch (Exception ignorado) {
            // Atalho é conforto, não função essencial.
        }
    }

    private ShortcutInfo atalho(String acao, String longo, String curto) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("oaze://acao/" + acao));
        intent.setPackage(getPackageName());
        return new ShortcutInfo.Builder(this, "oaze-" + acao)
            .setShortLabel(curto)
            .setLongLabel(longo)
            .setIcon(Icon.createWithResource(this, R.mipmap.ic_launcher))
            .setIntent(intent)
            .build();
    }
}
