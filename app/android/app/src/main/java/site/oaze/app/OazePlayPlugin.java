package site.oaze.app;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/*
 * Assinatura do Oásis pela Google Play (Play Billing Library 8).
 *
 * O app só abre a tela de compra da Google e devolve o purchaseToken.
 * Quem libera o plano é o servidor (função oaze-play): ele pergunta à
 * Google se a compra existe, confere que foi feita para esta conta
 * (obfuscatedAccountId = SHA-256 do id do usuário) e confirma a compra.
 * Nenhuma decisão de acesso é tomada aqui.
 */
@CapacitorPlugin(name = "OazePlay")
public class OazePlayPlugin extends Plugin implements PurchasesUpdatedListener {

    private BillingClient cliente;
    private final Map<String, ProductDetails> detalhes = new HashMap<>();
    private PluginCall compraPendente;

    private interface Pronto { void rodar(); }

    private void conectar(PluginCall call, Pronto depois) {
        if (cliente == null) {
            cliente = BillingClient.newBuilder(getContext())
                .setListener(this)
                .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
                .enableAutoServiceReconnection()
                .build();
        }
        if (cliente.isReady()) { depois.rodar(); return; }
        cliente.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult r) {
                if (r.getResponseCode() == BillingClient.BillingResponseCode.OK) depois.rodar();
                else call.reject("A Google Play não está disponível neste aparelho.", "indisponivel");
            }

            @Override
            public void onBillingServiceDisconnected() { /* reconexão automática */ }
        });
    }

    /** Produtos de assinatura e seus planos básicos, com preço já formatado pela Google. */
    @PluginMethod
    public void produtos(PluginCall call) {
        JSArray ids = call.getArray("ids");
        if (ids == null || ids.length() == 0) { call.reject("Sem produtos.", "pedido"); return; }
        conectar(call, () -> {
            List<QueryProductDetailsParams.Product> lista = new ArrayList<>();
            try {
                for (int i = 0; i < ids.length(); i++) {
                    lista.add(QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(ids.getString(i))
                        .setProductType(BillingClient.ProductType.SUBS).build());
                }
            } catch (Exception e) { call.reject("Produtos inválidos.", "pedido"); return; }
            cliente.queryProductDetailsAsync(
                QueryProductDetailsParams.newBuilder().setProductList(lista).build(),
                (r, resultado) -> {
                    if (r.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                        call.reject("Não foi possível consultar os planos na Google Play.", "consulta");
                        return;
                    }
                    JSArray saida = new JSArray();
                    for (ProductDetails d : resultado.getProductDetailsList()) {
                        detalhes.put(d.getProductId(), d);
                        List<ProductDetails.SubscriptionOfferDetails> ofertas = d.getSubscriptionOfferDetails();
                        if (ofertas == null) continue;
                        for (ProductDetails.SubscriptionOfferDetails o : ofertas) {
                            List<ProductDetails.PricingPhase> fases = o.getPricingPhases().getPricingPhaseList();
                            ProductDetails.PricingPhase ultima = fases.get(fases.size() - 1);
                            JSObject item = new JSObject();
                            item.put("produto", d.getProductId());
                            item.put("plano", o.getBasePlanId());
                            item.put("oferta", o.getOfferId() == null ? "" : o.getOfferId());
                            item.put("token", o.getOfferToken());
                            item.put("preco", ultima.getFormattedPrice());
                            item.put("micros", ultima.getPriceAmountMicros());
                            item.put("moeda", ultima.getPriceCurrencyCode());
                            item.put("periodo", ultima.getBillingPeriod());
                            saida.put(item);
                        }
                    }
                    JSObject ret = new JSObject();
                    ret.put("ofertas", saida);
                    call.resolve(ret);
                });
        });
    }

    /** Abre a tela de compra. Resolve com o purchaseToken quando a Google confirma. */
    @PluginMethod
    public void comprar(PluginCall call) {
        String produto = call.getString("produto", "");
        String token = call.getString("token", "");
        String conta = call.getString("conta", "");
        if (!conta.matches("^[0-9a-f]{64}$") || token.isEmpty()) { call.reject("Pedido inválido.", "pedido"); return; }
        if (compraPendente != null) { call.reject("Já existe uma compra em andamento.", "ocupado"); return; }
        conectar(call, () -> {
            ProductDetails d = detalhes.get(produto);
            if (d == null) { call.reject("Plano não carregado. Tente de novo.", "pedido"); return; }
            BillingFlowParams.ProductDetailsParams item = BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(d).setOfferToken(token).build();
            BillingFlowParams params = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(java.util.Collections.singletonList(item))
                .setObfuscatedAccountId(conta)
                .build();
            compraPendente = call;
            call.setKeepAlive(true);
            BillingResult r = cliente.launchBillingFlow(getActivity(), params);
            if (r.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                compraPendente = null;
                call.setKeepAlive(false);
                call.reject("A Google Play não abriu a compra.", "abrir");
            }
        });
    }

    @Override
    public void onPurchasesUpdated(BillingResult r, List<Purchase> compras) {
        PluginCall call = compraPendente;
        compraPendente = null;
        if (call == null) return;
        call.setKeepAlive(false);
        int codigo = r.getResponseCode();
        if (codigo == BillingClient.BillingResponseCode.USER_CANCELED) {
            call.reject("Compra cancelada. Nada foi cobrado.", "cancelada");
            return;
        }
        if (codigo == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) {
            call.reject("Esta conta Google já tem o Oásis. Use \"Restaurar compra\".", "ja_tem");
            return;
        }
        if (codigo != BillingClient.BillingResponseCode.OK || compras == null || compras.isEmpty()) {
            call.reject("A compra não foi concluída. Nada foi cobrado.", "falhou");
            return;
        }
        call.resolve(descrever(compras.get(0)));
    }

    /** Compras de assinatura ativas nesta conta Google (para restaurar). */
    @PluginMethod
    public void compras(PluginCall call) {
        conectar(call, () -> cliente.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build(),
            (r, lista) -> {
                if (r.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject("Não foi possível consultar suas compras.", "consulta");
                    return;
                }
                JSArray saida = new JSArray();
                for (Purchase p : lista) saida.put(descrever(p));
                JSObject ret = new JSObject();
                ret.put("compras", saida);
                call.resolve(ret);
            }));
    }

    private JSObject descrever(Purchase p) {
        JSObject o = new JSObject();
        o.put("produto", p.getProducts().isEmpty() ? "" : p.getProducts().get(0));
        o.put("token", p.getPurchaseToken());
        o.put("pendente", p.getPurchaseState() == Purchase.PurchaseState.PENDING);
        o.put("confirmada", p.isAcknowledged());
        return o;
    }
}
