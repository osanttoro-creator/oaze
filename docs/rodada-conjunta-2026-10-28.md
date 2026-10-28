# OAZE — rodada conjunta de Android e Windows

Estado em 28/10/2026: código enviado para PRs de rascunho e builds de teste gerados. Nenhuma versão desta rodada foi publicada ou validada em um aparelho instalado.

## O que entrou no código

- O pacote Android reserva o topo e as bordas da tela para câmera, barras do sistema e aparelhos dobráveis. A regra cobre painel, telas de entrada e painéis sobrepostos.
- O Windows envia o usuário à Stripe e usa `oaze://billing` para abrir novamente o aplicativo ao voltar. A assinatura é sempre consultada no backend; a URL de retorno não libera um plano.
- O painel mostra estado do plano, ciclo e acesso à gestão do cartão Stripe. Na distribuição Google Play a compra continua bloqueada até existirem produtos e integração de cobrança da loja.
- O relatório “Estado do OAZE” permite últimos 30 dias, mês ou ano e baixa somente PDF. O cálculo usa lançamentos confirmados do espaço ativo. O PDF é criado localmente; no Android usa o menu nativo de compartilhamento para escolher onde guardar.
- O atalho “Seja Pro” fica no cabeçalho; a seleção de idioma fica nas Configurações. O contato `info@oaze.site` aparece no app.
- O gráfico de categorias recebe atributos SVG próprios como alternativa quando a animação falha no Windows. Ícones recebem cor com contraste calculado; cartões conservam a superfície escura e ganham uma pequena faixa da cor do cartão.
- A troca de perfil deixa de renderizar duas vezes. COCO sinaliza quando uma resposta passa de oito segundos e quando está gerando áudio. As instruções do serviço deixam de forçar português quando a pessoa usa outra língua; a qualidade da voz ainda exige escuta com serviço conectado.

## Evidência de validação

- App em cópia local: 243 testes passaram; tipagem, build da interface, build do painel empacotado e scanner interno passaram.
- Dependências distribuídas: `npm audit --omit=dev` não apontou vulnerabilidades na consulta local. O inventário total ainda mostra sete avisos em dependências de desenvolvimento.
- PDF: gerado e baixado no Edge com CSP restritiva, contendo cabeçalho PDF válido.
- Código cliente: busca dirigida por formatos de chave privada não encontrou segredos; isso não equivale a auditoria completa de todas as dependências.
- CI do commit `b46b563`: verificação, Android e Windows passaram. O APK de teste e instaladores MSI/NSIS estão em `builds/` no Drive. Os hashes completos estão no fim deste documento.
- A suíte legada de UI do site tem testes com seletores antigos; `v3-widgets-inicio`, `v3-wallet-redesign-ui`, `v3-navegacao-coco` e contrato legal básico passaram. Testes de COCO e fluxo completo precisam ser atualizados para a interface atual.

## Portas ainda abertas antes de publicar

1. Instalar e percorrer cobrança real de teste no Windows, retorno do navegador, troca de perfil, PDF e widgets. O navegador ou sistema ainda pode mostrar uma confirmação para abrir o protocolo `oaze://`.
2. Instalar o Android em aparelhos com recorte de câmera e em um fold/flip, girar a tela, digitar com teclado aberto e confirmar que dados e botões continuam acessíveis. O APK foi gerado pelo GitHub Actions; o SDK Android não estava disponível na máquina local.
3. Criar produtos no Play Console e implementar/testar Google Play Billing antes de vender assinatura dentro da versão de loja. Não atribuir acesso por retorno de URL.
4. Verificar entrega e responsável pela caixa `info@oaze.site`; manter o canal de privacidade distinto.
5. Preencher razão social, CNPJ e endereço confirmados; definir o canal de encarregado ou verificar formalmente eventual dispensa aplicável. `privacidade.html` e `termos.html` ainda se declaram minutas; a cláusula de SLA 99,5% precisa de capacidade de medição e cumprimento. Revisão jurídica final permanece pendente.
6. Conferir direitos de uso dos assets COCO e demais imagens, textos alternativos, contraste, teclado e leitores de tela no pacote instalado. A revisão dirigida não encontrou carregamento de analytics/pixel no código de cliente consultado; o inventário de rede em produção ainda falta.
7. Publicar a página de retorno do site e as duas funções Supabase junto da versão nativa correspondente, após teste de ponta a ponta. O empacotador Hostinger agora inclui `retorno-app.html`.

## Pacotes de teste desta rodada

- Android: `builds/android-20261028/app-debug.apk` (APK de teste, sem assinatura de loja). SHA-256: `CD0C3BAD8C040971EBE2153261CFA18EC9D9995BE783F373BA1C43471E39C258`.
- Windows NSIS: `builds/windows-20261028/nsis/OAZE_2.0.5_x64-setup.exe`. SHA-256: `BEBB7D91CD6896671DA7EA848B40C6D95BCD9215AE82B36229078EF5D768F919`.
- Windows MSI: `builds/windows-20261028/msi/OAZE_2.0.5_x64_en-US.msi`. SHA-256: `51C1B61A4A2A7357017184ED172F8C89B00BDE5741BC41BBF4D461585B552B08`.
- O build Windows usa o painel publicado empacotado; estas compilações de teste configuram `VITE_OAZE_SYNC_ENABLED=false` para a camada React, portanto exigem validação instalada do login e da sincronização antes de qualquer alegação de funcionamento entre aparelhos.
- O GIF oficial `COCO_PETS_idle-jump-idle.gif` do Drive foi inspecionado: 384×448, 8 quadros, fundo bege opaco e legenda `idle` dentro da imagem. Não foi inserido diretamente no botão flutuante porque produziria um retângulo visível. A versão atual continua com a arte transparente e movimento CSS; a conversão do GIF oficial para transparência, sem legenda e com revisão dos quadros fica pendente.

## Referências oficiais para o fechamento legal e de loja

- [ANPD: controlador, encarregado e hipótese para agentes de pequeno porte](https://www.gov.br/anpd/pt-br/canais_atendimento/cidadao-titular-de-dados/denuncia-peticao-de-titular).
- [Google Play: conteúdo e política de privacidade exigidos na revisão](https://support.google.com/googleplay/android-developer/answer/9859455).
- [Google Play: declaração de segurança dos dados](https://support.google.com/googleplay/android-developer/answer/10787469).
