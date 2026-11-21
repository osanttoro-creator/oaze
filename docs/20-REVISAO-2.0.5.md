# OAZE app 2.0.5 — entrada, fundo, desbloqueio e cobrança

Data: 26/10/2026. Escopo: pacote Android de teste e aplicativo Windows que empacotam o painel de `app/live-site/`.

## Mudanças

- A primeira visita sem sessão mostra uma tela de boas-vindas persistente. O botão **Começar** abre o login; visitas seguintes mostram a tela de carregamento enquanto a sessão é conferida. O aceite de entrada continua no formulário existente.
- O fundo WebGL usa faixas fluidas azuis e verdes mais estreitas, com predominância de preto. A alternativa estática foi ajustada e a opção de reduzir movimento continua respeitada.
- A Coco usa o render oficial transparente e flutua por CSS, sem círculo. O GIF anterior continua arquivado nos assets, mas tinha fundo creme e legenda embutidos, portanto não era adequado para uma apresentação sem moldura.
- O app instalado oferece desbloqueio opcional pelo sistema: biometria/credencial do Android ou Windows Hello. Após 15 segundos em segundo plano, pede nova confirmação ao voltar. O PIN do cofre continua obrigatório para revelar ou salvar dados bancários protegidos; esta trava da tela não substitui o PIN do servidor.
- A função `oaze-pagamento` no Supabase foi atualizada para aceitar somente as origens nativas exatas `https://localhost` e `http://tauri.localhost` além das origens já configuradas. O portal de cobrança já aceitava ambas. O código do backend compartilhado fica em `G:\Meu Drive\sites\OAZE\o site\supabase\functions\oaze-pagamento\index.ts`.
- Corrigido um `}` excedente em `app.css` que causava erro ao abrir a prévia com Vite.

## Evidência e limites

- Função `oaze-pagamento` v12 ativa. OPTIONS respondeu 200 e devolveu a origem correta para Android, Windows e `https://oaze.site`; origem externa recebeu `null`.
- `oaze-billing-portal` respondeu 204 com as três origens previstas.
- Tabela `plan_prices`: Oásis em BRL vigente por R$ 35,90/mês e R$ 279,90/ano, igual ao exibido no app.
- `typecheck`, build web, build do painel empacotado, scanner de segurança e 241 testes passaram na cópia local. O scanner terminou com 3 avisos sobre URLs literais em exemplos e nenhum problema.
- Prévia em largura real de 390 px e desktop 1440 px: sem erro JavaScript e sem rolagem horizontal. Imagens em `docs/previews/oaze-2.0.5-*`; os dados da tela inicial são de demonstração.
- Ainda falta testar biometria em aparelho Android e Windows Hello numa instalação real. O checkout e o portal precisam ser testados com uma conta assinante, sem efetuar cobrança de teste em conta real sem escolha explícita.
- O AAB da Google Play permanece sem compra Stripe dentro do app. Vender a assinatura digital no AAB exige integrar Google Play Billing e verificar compras no backend antes de liberar o plano. Este trabalho ainda depende dos produtos criados no Play Console e da configuração de acesso à API; o APK de teste fora da loja e o Windows usam Stripe.
- IDs e sequência sugeridos para o Console estão em `docs/21-ASSINATURA-GOOGLE-PLAY.md`. Os produtos ainda não existem; a criação no Console e a integração não devem ser descritas como prontas.
- A função de pagamento publicada estava numa revisão anterior ao arquivo local do site. O deploy v12 aplicou somente a alteração de CORS sobre a revisão publicada v11 para não alterar regras de planos por acidente. Antes de qualquer novo deploy a partir do site, comparar a versão local com a função publicada.

## Pacotes de teste gerados

- [APK Android 2.0.5 build 27](https://drive.google.com/file/d/1ndPKfThnR2E8L3axzb4EvtMmczAsAZWg/view?usp=drivesdk), SHA-256 `6D189D27875D4F76AE0A96DD243D84CF65E58ED1DB68E5237538F6C043B6D86B`.
- [EXE Windows 2.0.5 build 24](https://drive.google.com/file/d/11jNjqWDmY-2HBOUcAlxhCDfpDExR8KJy/view?usp=drivesdk), SHA-256 `D7FB777554670ABE8A44C1BCDA4FE032C1C6A07649CB4E434BDA257103B50EEF`.
- [MSI Windows 2.0.5 build 24](https://drive.google.com/file/d/1MBiUqiYWAjEOsFUDgWbrbhKP5X5ACrZt/view?usp=drivesdk), SHA-256 `30CFAD8A7F95B34E66C4361B3957DF0E5677BBBACA6024B87C8181222400E8A5`.

[CI Android 27](https://github.com/osanttoro-creator/oaze/actions/runs/40416499968), [Windows 24](https://github.com/osanttoro-creator/oaze/actions/runs/40416498686) e [verificação 29](https://github.com/osanttoro-creator/oaze/actions/runs/40416498730) passaram no commit `e55bf19`. Os três arquivos estão em `builds/` da pasta canônica do app e foram enviados à mesma pasta no Google Drive. O APK foi aberto como ZIP e contém a entrada, a ponte nativa, o novo fundo e o render da Coco. O tamanho dos uploads foi conferido. Não foram instalados em aparelhos nesta sessão; os instaladores Windows seguem sem assinatura de código e não equivalem a submissão à Microsoft Store.
