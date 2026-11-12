# Tudo o que você vai precisar

Lista completa para ter o OAZE no iPhone e iPad, no Android e no computador, com a conta
sincronizada. Valores e prazos de pagamento estão na planilha
`OAZE-apps-custos-e-cronograma.xlsx`, aba **Custos**.

**Estado:** ✅ já tem · 🟡 providenciar · ⛔ trava o lançamento · ❔ confirmar

## 1. Empresa e identidade

| Item | Para quê | Estado | Quando | Custo |
|---|---|---|---|---|
| LTDA com CNPJ | Conta de organização nas lojas, com a razão social como vendedora; Termos e Privacidade | 🟡 em constituição | Já | fora da planilha |
| Número D-U-N-S da LTDA | A Apple e a Google exigem para conta de organização | 🟡 | Assim que o CNPJ sair. Pode levar até 30 dias | grátis |
| E-mail no domínio, como `suporte@oaze.site` | Contato nas três lojas. A Apple usa o domínio para confirmar a empresa | ❔ está publicado no site; confirmar que alguém lê | Já | já existe |
| Telefone e endereço da empresa | Verificação da Apple e da Google. A Google mostra dados de contato do desenvolvedor na ficha | 🟡 | Na inscrição | — |
| Documento de identidade de quem responde pela empresa | Verificação de identidade da Google e da Microsoft | ✅ | Na inscrição | — |
| Site no ar com Privacidade e Suporte | As três lojas pedem os links | ✅ `oaze.site/privacidade` e `oaze.site/suporte` | — | já existe |

> **Por que empresa e não pessoa física.** Na App Store, uma conta individual mostra o seu nome
> civil como vendedor em todas as fichas. Na Google Play, uma conta pessoal nova precisa de
> teste fechado com 12 testadores por 14 dias seguidos antes de publicar, e conta de
> organização não precisa. Os dois pontos pesam a favor de esperar o CNPJ.

## 2. Contas nas lojas

| Conta | Para quê | Estado | Quando pagar | Custo |
|---|---|---|---|---|
| Apple Developer Program (organização) | iPhone, iPad e o mesmo app no Mac | 🟡 | Quando o app do iPhone estiver pronto para o TestFlight | US$ 99 por ano |
| Google Play Console (organização) | Android, incluindo todos os Samsung | 🟡 | No começo da fase Android | US$ 25, uma vez |
| Microsoft Partner Center | Windows | 🟡 | Quando for publicar no Windows | grátis |
| Samsung Seller Portal | Galaxy Store, opcional | — | Depois da Google Play, se fizer sentido | grátis |

Todas com verificação em duas etapas, e com a senha só no seu gerenciador de senhas.

## 3. Serviços

| Serviço | Para quê | Estado | Quando | Custo |
|---|---|---|---|---|
| Supabase Pro | Backup automático, projeto que não pausa e proteção contra senha vazada | 🟡 hoje é Free (conector, 17/09/2026) | Antes do primeiro app público | US$ 25 por mês |
| SMTP próprio | Os apps entram com código por e-mail. O SMTP padrão do Supabase manda só 2 e-mails por hora | ⛔ | Antes do primeiro app público | cotar |
| Google Cloud: clientes OAuth de iOS e de Android | Login nativo com Google | 🟡 o cliente web já existe no projeto "My Project 88914" | Fase 1 | grátis |
| Apple: App ID com Sign in with Apple | Login com Apple, obrigatório no iPhone porque há login com Google (4.8) | 🟡 | Fase 3 | incluído na Apple |
| Chave APNs e Firebase Cloud Messaging | Push do servidor | — | Novas funções v2 | grátis |
| RevenueCat | Só se um dia vender dentro do app | — | — | grátis até US$ 2.500 de receita por mês |

## 4. Computador e aparelhos

| Item | Para quê | Estado | Custo |
|---|---|---|---|
| PC com Windows | Android Studio, PWABuilder e Partner Center | ✅ | — |
| Node.js | Linha de comando do Capacitor | ✅ v24.19.0 neste PC | — |
| Mac com chip Apple e macOS Sequoia 15.6 ou mais novo | Xcode 26, para compilar o app do iPhone | ❔ as sessões do OAZE registraram um Mac em 15/09/2026; confirmar se é seu. O Xcode 26.4 já pede macOS Tahoe 26.2 | sem Mac: Codemagic, 500 minutos grátis por mês |
| iPhone | Testar Face ID, notificações e atalhos de verdade | ❔ | — |
| Celular Android | Testar biometria, notificações e desempenho | ❔ | cotar, se não tiver |
| iPad | Conferir o layout. O simulador do Xcode resolve | opcional | — |

## 5. Programas (todos grátis)

| Programa | Versão | Por quê |
|---|---|---|
| Xcode | 26 ou mais novo | A App Store só aceita builds do Xcode 26 desde 28/04/2026 |
| Android Studio | Otter 2025.2.1 ou mais novo | Exigência do Capacitor 8 |
| Capacitor | 8.x (8.5.2 em 11/09/2026) | CLI, core, iOS e Android |
| Plugins oficiais | `@capacitor/app`, `@capacitor/browser`, `@capacitor/haptics`, `@capacitor/local-notifications`, `@capacitor/preferences`, `@capacitor/share`, `@capacitor/splash-screen`, `@capacitor/status-bar`; mais tarde `@capacitor/push-notifications` | Ciclo de vida do app, links externos, vibração, lembretes, armazenamento, compartilhar, abertura e barra de status |
| Plugins da comunidade | `@capgo/capacitor-social-login` (Google e Apple nativos, com guia para Supabase), `@capgo/capacitor-native-biometric`, `@capawesome/capacitor-app-shortcuts`, `@capacitor-community/privacy-screen` e um armazenamento seguro no Keychain e no Keystore, como `@aparajita/capacitor-secure-storage` | Login, biometria, atalhos, tela protegida e sessão guardada com segurança. **Conferir a compatibilidade com o Capacitor 8 antes de instalar cada um** |

## 6. Mudanças no site e no Supabase

Antes do primeiro build: `05-site-e-supabase-o-que-mudar.md`. Em resumo:

- liberar as origens do app nas Edge Functions;
- IDs de cliente do Google e da Apple no Auth;
- modelos de e-mail com código;
- SMTP próprio;
- três migrações pequenas: trava de versão, consentimento da UGLEZ e denúncias;
- a pasta `/.well-known/` no pacote da Hostinger;
- a página pública de exclusão de conta.

## 7. Jurídico e privacidade

| Item | Por quê | Estado |
|---|---|---|
| Termos e Privacidade finais, com razão social, CNPJ e encarregado de dados | As lojas pedem o link. A LGPD exige o encarregado | ⛔ minuta publicada em 15/09/2026 |
| Privacidade nomeando Supabase, OpenAI e Stripe, com o que cada um recebe | Tem que bater com o que você declara na Apple e na Google | ⛔ |
| Consentimento antes da primeira pergunta à UGLEZ | Apple 5.1.2(i) | ⛔ |
| Botão para denunciar resposta da UGLEZ | Política de conteúdo gerado por IA da Google Play | ⛔ |
| Página pública explicando como excluir a conta | A Google Play pede uma URL, não só o botão dentro do app | 🟡 o botão já existe em Configurações |

## 8. Material de loja

| Item | Estado | Onde está |
|---|---|---|
| Textos das fichas, com limites de caracteres conferidos | ✅ | `1-ficha-*.md` de cada pasta |
| Respostas de privacidade | ✅ rascunho | `04-privacidade-e-dados.md` e o arquivo de privacidade de cada loja |
| Ícone de 1024 × 1024 sem transparência (Apple) | 🟡 exportar do medalhão aprovado (`assets/img/oaze-mark.svg`), sem redesenhar | — |
| Ícone de 512 × 512 (Google e Windows) | ✅ `assets/img/oaze-512.png` e a versão mascarável | site |
| Capturas de tela nos tamanhos de cada loja | 🟡 dá para gerar como as `assets/img/telas/*.webp`, com dados de demonstração | seção de imagens de cada ficha |
| Imagem de destaque de 1024 × 500 (Google) | 🟡 | `02-android-samsung/1-ficha-google-play.md` |
| Conta de teste para os revisores, com dados de exemplo e plano Oásis | 🟡 | `01-apple-iphone-ipad-mac/3-notas-para-a-revisao.md` |

## 9. Pessoas

| Quem | Quando |
|---|---|
| 12 testadores por 14 dias seguidos | Só se a conta da Google for pessoal |
| Testadores do TestFlight: até 100 internos e 10.000 externos | Opcional, antes da revisão da Apple |
| Alguém para ler `suporte@oaze.site` | Desde o primeiro dia nas lojas |
