# Novas funções

Proposta, não decisão. O critério para uma função entrar na **v1**, a primeira versão enviada
às lojas:

1. a loja exige; ou
2. faz o app valer mais que o site no celular; ou
3. protege os dados da conta.

O resto vai para a v2, depois que os apps estiverem aprovados. O cartão de operação do OAZE
registra que o gargalo hoje é a última milha (pagamento, sincronização, jurídico), e não falta
de funcionalidade. Por isso a v1 é curta.

## v1: entra no primeiro envio

| Função | Por que entra | iPhone | Android | Windows | Como | O dado sai do aparelho? |
|---|---|---|---|---|---|---|
| Bloqueio com Face ID, Touch ID ou digital | App financeiro. Ajuda a passar na diretriz 4.2 da Apple | sim | sim | não (fica para o app nativo de desktop) | `@capgo/capacitor-native-biometric` e `@capacitor-community/privacy-screen` | Não |
| Lembretes de vencimento | Faz o app valer mais que o site | sim | sim | não | `@capacitor/local-notifications`, com as datas calculadas pelo `Calc` | Não |
| Atalhos no ícone | Lançar em um toque | sim | sim | sim, na lista de atalhos da barra de tarefas | `@capawesome/capacitor-app-shortcuts`; no Windows, `shortcuts` do manifesto | Não |
| Entrar com Apple e com Google, nativos | Exigido pela Apple (4.8). Some a tela com o endereço do Supabase | sim | sim | igual ao site | `@capgo/capacitor-social-login` | Vai ao provedor e ao Supabase, como hoje |
| Código por e-mail | O link mágico abriria o navegador, não o app | sim | sim | igual ao site | `verifyOtp` do supabase-js | Como hoje |
| Consentimento e denúncia na UGLEZ | Exigido (Apple 5.1.2(i) e Google Play) | sim | sim | sim (vale também para o site) | Tela antes da primeira pergunta e tabela `uglez_denuncias` | A denúncia envia a resposta denunciada |
| Sair dos outros aparelhos | A conta passa a estar em vários aparelhos | sim | sim | sim | `supabase.auth.signOut({ scope: 'others' })` | Não |
| Trava de versão mínima | Protege a sincronização de apps desatualizados | sim | sim | não precisa (é o site) | Tabela `app_versoes` | Não |

### Bloqueio com biometria

- **Configurações → Segurança → "Pedir Face ID ao abrir".** Vem desligado. É oferecido uma vez,
  logo depois do primeiro login: "Quer proteger o OAZE com Face ID?".
- **Tempo em segundo plano antes de pedir de novo:** imediato, 1, 5 (padrão) ou 15 minutos.
- **Alternador de apps:** com o bloqueio ligado, a miniatura mostra o medalhão sobre o fundo
  `#071822`, e não os valores. No Android, a miniatura dos apps recentes fica desativada.
- **Se a biometria falhar ou não existir:** vale a senha do aparelho. Nunca a senha da conta do
  OAZE.
- **Texto da permissão no iPhone:** "O OAZE usa o Face ID para proteger seus dados financeiros
  quando você abre o app."

### Lembretes de vencimento

- **Quais:**
  - fatura do cartão 3 dias antes e no dia, às 9h;
  - despesa fixa prevista e ainda não confirmada, no dia, às 9h;
  - recorrência do dia, às 9h.
- **Como:** calculados pelo `Calc` ao abrir, ao voltar do segundo plano e depois de cada
  sincronização. O app reagenda os próximos 30 dias, com no máximo 60 lembretes pendentes: o
  iOS guarda só os 64 mais próximos.
- **Texto na tela bloqueada:** por padrão, sem valor. Exemplo: "Fatura do cartão Nubank vence
  amanhã". Duas opções em Configurações → Notificações:
  - "Mostrar valores";
  - "Texto genérico", que vira "Você tem um vencimento amanhã no OAZE".
- **Permissão:** pedida quando a pessoa liga os lembretes, nunca na primeira abertura. No
  Android 13 ou mais novo é `POST_NOTIFICATIONS`. Não pedir alarme exato: alguns minutos de
  atraso não importam aqui, e a Google Play restringe essa permissão.
- **Privacidade:** nada sai do aparelho. Os lembretes são calculados e agendados localmente.

### Atalhos no ícone

- Três atalhos: **Nova despesa**, **Nova receita** e **Perguntar à UGLEZ**.
- **iPhone e Android:** abrem `site.oaze.app://novo/despesa`, `.../novo/receita` e `.../uglez`.
- **Windows:** `/app?novo=despesa`, `/app?novo=receita` e `/app/uglez`.
- **Código:** ao abrir por atalho, chamar a mesma função das teclas `D` e `R` que já existem.

### Consentimento e denúncia na UGLEZ

- **Antes da primeira pergunta, uma folha "Antes de perguntar à UGLEZ" com:**
  - **O que vai:** a pergunta, as 3 últimas trocas, os totais e categorias do período, as metas,
    o histórico que o plano permite e as despesas previstas por dia.
  - **Para quem:** o servidor do OAZE no Supabase, que repassa à OpenAI.
  - **O que não vai:** descrição de lançamento, nome de conta ou de cartão, e-mail e
    identificadores.
  - **Guarda:** o OAZE não guarda a conversa e pede à OpenAI que não armazene a resposta
    (`store: false`).
  - **Botões:** "Autorizar e perguntar" e "Agora não". Dá para revogar em Configurações →
    UGLEZ.
- **Registro do consentimento:** `user_settings.uglez_consentimento_em` e
  `uglez_consentimento_versao`. A Edge Function `oaze-assistant` recusa a pergunta sem
  consentimento registrado, para a regra não depender só da tela.
- **Denúncia:** cada resposta tem "Denunciar".
  - **Motivos:** ofensiva, errada, perigosa ou outra, com comentário opcional.
  - **Onde grava:** `uglez_denuncias`. Cada pessoa só insere as próprias denúncias e não lê as
    dos outros.
  - **Privacidade:** a política precisa dizer que a resposta denunciada é guardada para análise.

## v2: depois da aprovação

| Função | O que faz | Como | Custo |
|---|---|---|---|
| Widgets | "Sobra do mês" e "Próximo vencimento" na tela inicial, com opção de esconder valores | Código nativo: WidgetKit (Swift) e App Widget (Kotlin), com os dados compartilhados pelo app | Grátis. Esforço alto |
| Push do servidor | Aviso semanal "Seu resumo da semana está pronto", sem valores no texto | APNs e Firebase Cloud Messaging, tabela de tokens com RLS e Edge Function agendada | Grátis. Declarar o identificador do aparelho nas lojas |
| Siri, Atalhos da Apple e Google Assistant | "Adicionar despesa no OAZE" por voz | App Intents (Swift) e atalhos dinâmicos do Android | Grátis |
| Aparelhos conectados | Lista de sessões com a última atividade, para sair de um aparelho específico | RPC `security definer` sobre as sessões do Auth, só as da própria pessoa | Grátis |
| Compartilhar o resumo do mês | Imagem gerada no aparelho, pela folha de compartilhar do sistema | `@capacitor/share` | Grátis |
| App nativo de desktop | Atalho global para lançar de qualquer lugar, ícone na bandeja com a sobra do mês e Windows Hello | Tauri 2. Ver `03-desktop-windows-mac/CHECKLIST.md` | Certificado de assinatura, se for fora da loja |

## Não recomendado agora

| Ideia | Por que não agora |
|---|---|
| Conexão automática com bancos (Open Finance) | É uma frente nova: contrato e custo por conexão com um agregador, e um escopo de segurança bem maior. A importação de extratos saiu do OAZE em 16/09/2026 |
| Ler comprovante por foto | Reabre o processamento de arquivos e imagens que saiu junto com a importação |
| Ler notificações dos bancos no Android | A permissão dá acesso às notificações de todos os apps. A revisão da Google Play e a confiança de quem instala pesam contra |
| Apple Watch e Wear OS | Esforço alto para pouco uso num app de registro e leitura |
