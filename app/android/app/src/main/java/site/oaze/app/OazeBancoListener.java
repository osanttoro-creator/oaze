package site.oaze.app;

import android.app.Notification;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.regex.Pattern;

/*
 * Lê SÓ os avisos dos apps de banco e cartão (lista fechada abaixo) e guarda
 * no aparelho os que parecem compra ou recebimento ("R$ 45,90"). Nada sai do
 * aparelho: o OAZE mostra a sugestão e a pessoa decide se lança. A pessoa
 * liga e desliga em Configurações › Acesso a notificações (01/11/2026).
 */
public class OazeBancoListener extends NotificationListenerService {

    static final String PREFS = "oaze_banco_avisos";
    static final String CHAVE = "fila";
    private static final int MAX = 60;

    static final Set<String> BANCOS = new HashSet<>(Arrays.asList(
        "com.nu.production", "com.itau", "com.itau.iti", "br.com.itau.pf", "com.bradesco", "br.com.bradesco.next",
        "com.santander.app", "br.com.bb.android", "br.com.gabba.Caixa", "br.gov.caixa.tem", "br.com.intermedium",
        "com.c6bank.app", "com.picpay", "com.mercadopago.wallet", "br.com.uol.ps.myaccount", "br.com.neon",
        "br.com.original.bank", "com.sicoob.cartoes", "br.com.sicoobnet", "br.com.sicredi.app", "com.btg.pactual.banking",
        "br.com.xp.carteira", "br.com.digio", "com.pan.mobile", "br.com.bancobmg.bancodigital", "br.com.agibank",
        "com.nomad.app", "br.com.willbank", "br.com.banrisul", "com.ame.digital", "br.com.cora", "br.com.stone",
        "com.ton.app", "com.wise.android", "com.revolut.revolut", "br.com.inter.investimentos", "br.com.daycoval",
        "com.porto.bank", "br.com.recargapay", "com.paypal.android.p2pmobile", "br.com.ourocard", "com.credicard"
    ));
    private static final Pattern VALOR = Pattern.compile("R\$\s?[\d.]+,\d{2}");
    private static final Pattern TIPO = Pattern.compile("(?i)(compra|aprovad|pix|transfer|recebid|pagamento|d[eé]bito|cr[eé]dito|saque|dep[oó]sito)");

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        try {
            if (sbn == null || !BANCOS.contains(sbn.getPackageName())) return;
            Bundle extras = sbn.getNotification().extras;
            CharSequence titulo = extras.getCharSequence(Notification.EXTRA_TITLE);
            CharSequence texto = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
            if (texto == null) texto = extras.getCharSequence(Notification.EXTRA_TEXT);
            String tudo = ((titulo == null ? "" : titulo + ". ") + (texto == null ? "" : texto)).trim();
            if (tudo.length() > 400) tudo = tudo.substring(0, 400);
            if (!VALOR.matcher(tudo).find() || !TIPO.matcher(tudo).find()) return;
            guardar(this, sbn.getPackageName(), app(sbn.getPackageName()), tudo, sbn.getPostTime());
        } catch (Exception ignorado) {
            // aviso fora do formato: segue sem guardar
        }
    }

    static synchronized void guardar(Context ctx, String pacote, String app, String texto, long quando) throws Exception {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        JSONArray fila = new JSONArray(p.getString(CHAVE, "[]"));
        for (int i = 0; i < fila.length(); i++) {
            JSONObject o = fila.getJSONObject(i);
            if (texto.equals(o.optString("texto")) && Math.abs(quando - o.optLong("quando")) < 120_000) return;
        }
        JSONObject novo = new JSONObject();
        novo.put("id", pacote.hashCode() + "-" + quando);
        novo.put("app", app);
        novo.put("pacote", pacote);
        novo.put("texto", texto);
        novo.put("quando", quando);
        JSONArray saida = new JSONArray();
        saida.put(novo);
        for (int i = 0; i < fila.length() && saida.length() < MAX; i++) saida.put(fila.get(i));
        p.edit().putString(CHAVE, saida.toString()).apply();
    }

    private String app(String pacote) {
        try {
            return getPackageManager().getApplicationLabel(getPackageManager().getApplicationInfo(pacote, 0)).toString();
        } catch (Exception e) {
            return "Banco";
        }
    }
}
