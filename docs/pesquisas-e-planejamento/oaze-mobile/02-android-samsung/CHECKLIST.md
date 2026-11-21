# Android: Google Play e Samsung

Passo a passo para publicar o OAZE no Android. **A Google Play já chega a todo celular Samsung**
— a Galaxy Store é opcional e está no fim deste arquivo.

**Custo desta plataforma:** US$ 25, uma vez (R$ 139,92 com dólar, IOF e margem da planilha).
**Quando pagar:** no começo da fase Android. É a plataforma mais barata e a mais rápida de
começar.

## O que postar e onde

| Tela | Arquivo desta pasta |
|---|---|
| Play Console → Ficha da loja principal | `1-ficha-google-play.md` |
| Play Console → Política → Conteúdo do app → Segurança dos dados | `2-seguranca-dos-dados.md` |
| Play Console → Política → Conteúdo do app (as outras declarações) | `3-conteudo-do-app.md` |
| Projeto Android (`android/app/`) | `arquivos/AndroidManifest-trecho.xml`, `arquivos/strings.xml` |
| Site: `o site/.well-known/` | `arquivos/assetlinks.json` |

## Antes de começar

- [ ] Fases 0 e 1 do cronograma concluídas (planilha, aba **Cronograma**).
- [ ] `00-comum-a-todas/05-site-e-supabase-o-que-mudar.md` aplicado.
- [ ] Roteiro de teste da sincronização passando no emulador.

## A. Conta

1. **Tipo de conta.** Recomendo **organização**, com a LTDA e o D-U-N-S. Além de mostrar a
   empresa, e não você, a conta de organização **dispensa o teste fechado com 12 testadores por
   14 dias seguidos**, que é obrigatório para conta pessoal criada depois de 13/11/2023.
2. **Criar a conta** em `play.google.com/console`, pagar os US$ 25 e passar pela verificação de
   identidade. Ela pode levar alguns dias.
3. **Verificação de desenvolvedor do Android.** Desde 30/09/2026, no Brasil, um app só instala
   em aparelho Android certificado se o desenvolvedor for verificado. Quem publica pela Play
   cumpre isso pela própria verificação da Play Console. Só quem distribui fora dela precisa da
   Android Developer Console, que custa outros US$ 25.

## B. Projeto

4. Na pasta `oaze mobile/app-nativo/`, com o `www` já montado:
   ```bash
   npx cap add android
   npx cap open android
   ```
5. **`android/app/build.gradle`:**
   - `applicationId` = `site.oaze.app`. **Não muda depois de publicado.**
   - `targetSdkVersion` = 36. Desde 31/08/2026 a Play não aceita envio abaixo disso.
   - `versionCode` 1 e `versionName` "1.0.0". Cada envio precisa de um `versionCode` maior.
6. **`AndroidManifest.xml`:** acrescente o que está em `arquivos/AndroidManifest-trecho.xml`.
   São as permissões, os links do oaze.site e a decisão sobre backup.
7. **`res/values/strings.xml`:** use `arquivos/strings.xml`.
8. **Ícones:**
   - ícone do app pelo Image Asset Studio do Android Studio, a partir do medalhão
     (`assets/img/oaze-mark.svg`), com fundo `#071822`;
   - ícone da barra de status para as notificações: `ic_stat_oaze`, **branco sobre
     transparente**, só silhueta. Sem ele, a notificação vira um quadrado cinza.

## C. Assinatura do app

9. **Gere a chave de upload** (Android Studio → Build → Generate Signed Bundle → Create new).
   - Guarde o arquivo `.jks` e a senha no gerenciador de senhas e num segundo lugar seguro.
   - **Perder a chave de upload dá para recuperar com a Google; perder o controle da conta,
     não.** Nunca versione o `.jks`.
10. **Play App Signing:** deixe ligado, que é o padrão. A Google guarda a chave final.
11. **Impressões digitais.** Em Play Console → Teste e lançamento → Configuração → Integridade
    do app estão o SHA-1 e o SHA-256 das duas chaves (a de upload e a de assinatura do app):
    - **SHA-1 das duas** vai no cliente OAuth Android do Google Cloud. Sem o SHA-1 da chave de
      assinatura da Play, o login com Google funciona no seu aparelho e falha para quem baixa
      da loja;
    - **SHA-256 da chave de assinatura do app** vai em `arquivos/assetlinks.json`, que é
      publicado no site.

## D. Teste

12. **Teste interno:** até 100 pessoas, liberação em minutos. Rode aqui:
    - o roteiro de sincronização (`00-comum-a-todas/02-...`);
    - login com Google, com Apple e com código por e-mail;
    - biometria;
    - um lembrete agendado para daqui a 2 minutos;
    - os três atalhos do ícone (segurar o ícone na tela inicial);
    - consentimento e denúncia na UGLEZ;
    - excluir conta;
    - o app sem internet e voltando à internet.
13. **Teste fechado**, se a conta for pessoal: 12 testadores aceitos e ativos por 14 dias
    seguidos, sem sair no meio. Quem entra e sai antes não conta.
14. **Aparelho real**, de preferência um Samsung, para conferir biometria, notificação e a
    barra de gestos.

## E. Ficha e conteúdo do app

15. **Criar o app** na Play Console: nome, idioma padrão português (Brasil), tipo "app",
    gratuito.
16. Cole `1-ficha-google-play.md` na ficha da loja principal e envie as imagens.
17. Responda, em Política → Conteúdo do app, tudo o que está em `3-conteudo-do-app.md`:
    política de privacidade, acesso ao app, anúncios, classificação, público-alvo, recursos
    financeiros, exclusão de conta e conteúdo gerado por IA.
18. Responda **Segurança dos dados** com `2-seguranca-dos-dados.md`. Ela precisa bater com a
    Política de Privacidade publicada.

## F. Produção

19. Envie o `.aab` para produção, com o Brasil selecionado.
20. A primeira revisão de uma conta nova costuma demorar mais que as seguintes: conte dias, não
    horas.
21. Depois de publicado, confira no aparelho: abrir `https://oaze.site/app` precisa abrir o app,
    não o navegador. Se abrir o navegador, o `assetlinks.json` está errado ou não está sendo
    servido.

## Depois de publicado

- **Cada mudança no site:** `montar-www.ps1`, `npx cap sync android`, `versionCode` novo, envio.
- **Mudou o formato do que sobe para a conta:** suba a versão mínima em `app_versoes`.
- **Prazos que voltam todo ano:** o nível de API exigido sobe uma vez por ano, sempre em agosto.
- **Vitals e avaliações:** olhe uma vez por semana.

## Pegadinhas do Android

| Pegadinha | O que fazer |
|---|---|
| Login com Google só funciona no seu aparelho | Faltou o SHA-1 da chave de assinatura da Play no cliente OAuth |
| `https://oaze.site/app` abre o navegador | `assetlinks.json` ausente, com SHA-256 errado ou fora do zip do deploy |
| Notificação como quadrado cinza | Falta o `ic_stat_oaze` branco sobre transparente |
| Lembrete não aparece no Android 13+ | Falta pedir `POST_NOTIFICATIONS` em tempo de execução |
| Recusa por alarme exato | Não peça `SCHEDULE_EXACT_ALARM`; alguns minutos de atraso não mudam nada aqui |
| Dados financeiros no backup do Google | Decida `allowBackup` conscientemente (ver o trecho do manifesto) |
| Envio recusado por nível de API | `targetSdkVersion` 36 |

## Samsung Galaxy Store (opcional)

Só depois da Play, e só se quiser presença na loja da Samsung.

- Cadastro no Seller Portal **sem taxa**, nem de entrada nem anual.
- Para distribuir conteúdo Android é preciso status de vendedor comercial, de pessoa jurídica.
  **Confirme a exigência para app gratuito no próprio Seller Portal:** a FAQ pública não é clara
  nesse ponto.
- Distribuir fora da Play entra na verificação de desenvolvedor do Android que passou a valer no
  Brasil em 30/09/2026.
- O ganho é pequeno: todo Samsung já tem a Play. O custo é mais uma ficha, mais uma revisão e
  mais um lugar para manter atualizado.
