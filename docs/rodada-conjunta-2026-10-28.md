# OAZE — rodada conjunta de Android e Windows

Estado em 28/10/2026: implementação local em andamento. Nenhuma versão desta rodada foi publicada ou validada em um aparelho instalado.

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
- A suíte legada de UI do site tem testes com seletores antigos; `v3-widgets-inicio`, `v3-wallet-redesign-ui`, `v3-navegacao-coco` e contrato legal básico passaram. Testes de COCO e fluxo completo precisam ser atualizados para a interface atual.

## Portas ainda abertas antes de publicar

1. Instalar e percorrer cobrança real de teste no Windows, retorno do navegador, troca de perfil, PDF e widgets. O navegador ou sistema ainda pode mostrar uma confirmação para abrir o protocolo `oaze://`.
2. Instalar o Android em aparelhos com recorte de câmera e em um fold/flip, girar a tela, digitar com teclado aberto e confirmar que dados e botões continuam acessíveis. O SDK Android não estava disponível neste ambiente para gerar novo APK nesta rodada.
3. Criar produtos no Play Console e implementar/testar Google Play Billing antes de vender assinatura dentro da versão de loja. Não atribuir acesso por retorno de URL.
4. Verificar entrega e responsável pela caixa `info@oaze.site`; manter o canal de privacidade distinto.
5. Preencher razão social, CNPJ e endereço confirmados; definir o canal de encarregado ou verificar formalmente eventual dispensa aplicável. `privacidade.html` e `termos.html` ainda se declaram minutas; a cláusula de SLA 99,5% precisa de capacidade de medição e cumprimento. Revisão jurídica final permanece pendente.
6. Conferir direitos de uso dos assets COCO e demais imagens, textos alternativos, contraste, teclado e leitores de tela no pacote instalado. A revisão dirigida não encontrou carregamento de analytics/pixel no código de cliente consultado; o inventário de rede em produção ainda falta.
7. Publicar a página de retorno do site e as duas funções Supabase junto da versão nativa correspondente, após teste de ponta a ponta. O empacotador Hostinger agora inclui `retorno-app.html`.

## Referências oficiais para o fechamento legal e de loja

- [ANPD: controlador, encarregado e hipótese para agentes de pequeno porte](https://www.gov.br/anpd/pt-br/canais_atendimento/cidadao-titular-de-dados/denuncia-peticao-de-titular).
- [Google Play: conteúdo e política de privacidade exigidos na revisão](https://support.google.com/googleplay/android-developer/answer/9859455).
- [Google Play: declaração de segurança dos dados](https://support.google.com/googleplay/android-developer/answer/10787469).
