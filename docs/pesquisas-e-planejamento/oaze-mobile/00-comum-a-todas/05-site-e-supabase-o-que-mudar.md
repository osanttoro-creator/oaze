# O que muda no site e no Supabase

Tudo o que precisa existir fora dos apps antes do primeiro build.

**Ordem do projeto:**

1. migração pelo conector do Supabase;
2. `node tools/verificar-tudo.js`;
3. push em `main`;
4. conferir no ar.

Nada daqui foi aplicado. Cada migração pede sua confirmação explícita.

## 1. Origens liberadas nas Edge Functions

`oaze-assistant`, `oaze-conta` e `oaze-pagamento` recusam qualquer `Origin` fora de
`OAZE_ALLOWED_ORIGINS`. A lista é separada por vírgula e cada item passa por `trim()`. O app
nativo chama de outra origem:

| Plataforma | Origem |
|---|---|
| iPhone e iPad (e o app no Mac) | `capacitor://localhost` |
| Android | `https://localhost` |
| Windows (PWA) | `https://oaze.site`, que já está na lista |

**No seu terminal**, com o valor completo. O `secrets set` substitui a lista inteira, então
repita o que já existe: `oaze.site`, `www` e o endereço antigo, conforme o cartão de operação
de 13/09/2026.

```powershell
supabase secrets set OAZE_ALLOWED_ORIGINS="https://oaze.site,https://www.oaze.site,ENDERECO_ANTIGO,capacitor://localhost,https://localhost" --project-ref gxwatircdhhetvzzlwwq
```

> `https://localhost` também é a origem de qualquer servidor local. Tudo bem: CORS não é
> autenticação. Quem protege os dados continua sendo o JWT conferido por `getUser()` e o RLS.

## 2. Auth → Provedores

**Google**

1. No Google Cloud (projeto "My Project 88914"), crie dois clientes OAuth:
   - **iOS**, com o bundle ID `site.oaze.app`;
   - **Android**, com o pacote `site.oaze.app` e o SHA-1 do certificado. Cadastre o SHA-1 da
     chave de upload **e** o da chave de assinatura da Play: a Play Console mostra os dois em
     Integridade do app.
2. No Supabase, em Authentication → Providers → Google → **Client IDs**, deixe o ID web atual
   primeiro e acrescente os de iOS e de Android, separados por vírgula.
3. Mantenha a verificação de nonce ligada. O guia do plugin `@capgo/capacitor-social-login`
   para Supabase trata o nonce.

**Apple**

1. Ligue o provedor Apple.
2. Em **Client IDs**, ponha `site.oaze.app`. É o que o login nativo apresenta.
3. O login com Apple **no site** é outra coisa: usa Services ID e uma chave secreta que a Apple
   faz vencer em no máximo 6 meses. Se ligar o botão escondido do site, anote a data de troca
   da chave. O login nativo não depende dela.

## 3. Modelos de e-mail com código

No app, o link do e-mail abriria o navegador e não o app. Os modelos passam a trazer o link,
para o site, **e** o código, para o app.

Em Authentication → Emails → Templates, acrescente o bloco abaixo aos modelos
**Confirm signup**, **Magic Link** e **Reset Password**, sem mudar o visual atual:

```html
<p style="margin:24px 0 8px">No app do OAZE, digite este código:</p>
<p style="font-size:30px;font-weight:600;letter-spacing:6px;margin:0 0 24px">{{ .Token }}</p>
<p style="margin:0">O código expira em 1 hora. Se você não pediu, ignore este e-mail.</p>
```

> "Expira em 1 hora" vale para o padrão de 3.600 segundos. Se mudar em Authentication →
> Providers → Email → Email OTP Expiration, ajuste o texto.

| Fluxo no app | Chamada | Confirmação do código |
|---|---|---|
| Entrar sem senha | `signInWithOtp({ email })` | `verifyOtp({ email, token, type: 'email' })` |
| Criar conta com senha | `signUp({ email, password })` | `verifyOtp({ email, token, type: 'email' })` |
| Esqueci a senha | `resetPasswordForEmail(email)` | `verifyOtp({ email, token, type: 'recovery' })` e depois `updateUser({ password })` |

## 4. SMTP próprio

O SMTP padrão do Supabase envia 2 e-mails por hora e não é para produção.

1. Authentication → Emails → **SMTP Settings**:
   - host, porta, usuário e senha do provedor (a senha só no painel);
   - remetente `nao-responda@oaze.site`, com o nome "OAZE".
2. Primeiro, veja se o e-mail do domínio oaze.site permite SMTP. Se não permitir, cote um
   serviço de e-mail transacional.
3. Depois, em Authentication → **Rate Limits**, suba o limite de e-mails para o volume de
   cadastros esperado.

## 5. Migrações

Rascunho no padrão das migrações do projeto: nomes em português, `to authenticated` e
`(select auth.uid())`. Revisar antes de aplicar.

```sql
-- 20260XXX_apps_nativos.sql

-- 1 · trava de versão mínima dos apps
create table if not exists public.app_versoes (
  plataforma   text primary key check (plataforma in ('ios', 'android')),
  minima       text not null,
  recomendada  text not null,
  mensagem     text,
  updated_at   timestamptz not null default now()
);
alter table public.app_versoes enable row level security;

create policy "qualquer um lê as versões dos apps"
  on public.app_versoes for select to anon, authenticated
  using (true);

-- escrita só pelo servidor: nenhuma política de insert, update ou delete
revoke insert, update, delete on public.app_versoes from anon, authenticated;

insert into public.app_versoes (plataforma, minima, recomendada)
values ('ios', '1.0.0', '1.0.0'), ('android', '1.0.0', '1.0.0')
on conflict (plataforma) do nothing;

-- 2 · consentimento da UGLEZ
alter table public.user_settings
  add column if not exists uglez_consentimento_em     timestamptz,
  add column if not exists uglez_consentimento_versao text;

comment on column public.user_settings.uglez_consentimento_em is
  'Quando a pessoa autorizou o envio do resumo agregado à IA (Apple 5.1.2(i)). Nulo = sem consentimento.';

-- 3 · denúncias de resposta da UGLEZ
create table if not exists public.uglez_denuncias (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  motivo      text not null check (motivo in ('ofensiva', 'errada', 'perigosa', 'outra')),
  comentario  text check (char_length(comentario) <= 1000),
  resposta    text not null check (char_length(resposta) <= 8000),
  created_at  timestamptz not null default now()
);
alter table public.uglez_denuncias enable row level security;

create policy "pessoa denuncia a própria resposta"
  on public.uglez_denuncias for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- ninguém lê, altera ou apaga pelo navegador
revoke all on public.uglez_denuncias from anon;
revoke select, update, delete on public.uglez_denuncias from authenticated;

create index if not exists uglez_denuncias_user_id_idx on public.uglez_denuncias (user_id);
```

**Depois da migração, na `oaze-assistant`:** antes de reservar a cota, ler
`user_settings.uglez_consentimento_em` da própria pessoa e recusar com um código novo,
`sem_consentimento`, quando estiver nulo. Assim a regra não depende só da tela.

**Conferir no fim:**

- rodar os advisors do Supabase;
- rodar `tools/testes/isolamento-rls.sql` com dois usuários reais;
- uma pessoa não pode ler a denúncia da outra.

## 6. Site na Hostinger

### 6.1 Links universais: `/.well-known/`

Os dois arquivos estão nas pastas das plataformas:

- `01-apple-iphone-ipad-mac/arquivos/apple-app-site-association`
- `02-android-samsung/arquivos/assetlinks.json`

Copie os dois para `o site/.well-known/` depois de preencher o Team ID e o SHA-256.

**Pegadinha do pacote:** o `montar-pacote.ps1` monta o zip com `Compress-Archive`, que **ignora
arquivos e pastas que começam com ponto**. O próprio script já acrescenta o `.htaccess` à mão
por isso. A pasta `.well-known` sumiria do zip do mesmo jeito, sem erro nenhum.

Em `deploy/hostinger/montar-pacote.ps1`:

```powershell
# seção 2
$pastas = @('assets', '.well-known')

# seção 6, dentro do mesmo try que acrescenta o .htaccess
foreach ($rel in @('.well-known/apple-app-site-association', '.well-known/assetlinks.json')) {
  if (-not ($arquivo.Entries | Where-Object { $_.FullName -eq $rel })) {
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $arquivo, (Join-Path $destino $rel), $rel) | Out-Null
  }
}
```

Em `deploy/hostinger/.htaccess`, o arquivo da Apple não tem extensão e precisa sair como JSON:

```apache
# Links universais do app (iOS): arquivo sem extensão, servido como JSON e sem redirecionamento
<Files "apple-app-site-association">
  ForceType application/json
  Header set Cache-Control "public, max-age=3600"
</Files>
```

**Mais três cuidados:**

- O site redireciona `www.oaze.site` para `oaze.site`, e a Apple não segue redirecionamento
  nesse arquivo. Registre só `applinks:oaze.site`.
- A regra que bloqueia `.env`, `.md`, `.sql` e `package.json` não pega `assetlinks.json`.
- **Conferir no ar:** `https://oaze.site/.well-known/apple-app-site-association` responde 200
  com `content-type: application/json`, e `https://oaze.site/.well-known/assetlinks.json`
  também.

### 6.2 Página pública de exclusão de conta

A Google Play pede uma URL onde a pessoa saiba como excluir a conta sem reinstalar o app. O
botão já existe em **Configurações → Excluir a conta**. Falta a página pública.

Sugestão: `/excluir-conta`, com rota no `.htaccess`, entrada no `montar-pacote.ps1` e no
`sitemap.xml`. Texto base, que depende da Política de Privacidade final:

> **Excluir a conta do OAZE**
>
> **No app ou no site:** entre na conta e abra **Configurações → Excluir a conta**. A exclusão
> apaga a conta e todos os dados do servidor, em todos os aparelhos, e encerra a assinatura.
> Não tem volta.
>
> **Sem acesso à conta:** escreva para suporte@oaze.site a partir do e-mail da conta, com o
> assunto "Excluir conta". [prazo de resposta a definir]
>
> **O que não é apagado por aqui:** o que você usou sem conta fica só no aparelho e sai quando
> você desinstala o app. [registros que a lei obriga a guardar, como os de cobrança, a confirmar
> na Política de Privacidade]

### 6.3 Código do app (repositório do site)

| Mudança | Arquivos |
|---|---|
| `window.OAZE_PLATAFORMA` esconde "Assinar", "Mudar de plano" e qualquer chamada para comprar no iPhone e no Android | `pages/precos.js`, `limites.js`, `pages/settings.js` |
| Ramo nativo de login (Google, Apple e código por e-mail) e sessão no armazenamento seguro | `supabase-auth.js`, `supabase-config.js` |
| Reler a conta no `resume` do app | `sync.js`, `estado-sync.js` |
| Folha de consentimento, "Denunciar" e revogação em Configurações → UGLEZ | `ai.js`, `pages/uglez.js`, `pages/settings.js` |
| "Sair dos outros aparelhos" | `pages/settings.js` |
| Abrir por atalho (`?novo=despesa`, deep link) | `app.js` |
| Lembretes, biometria e trava de versão (só no nativo) | arquivo novo, por exemplo `assets/js/nativo.js`, carregado só quando `OAZE_PLATAFORMA` não é `'web'` |
| Service worker e atalhos no manifesto (Windows) | `sw.js`, `manifest.webmanifest`, `montar-pacote.ps1`, `.htaccess`. Ver `03-desktop-windows-mac/CHECKLIST.md` |

Cada mudança entra com teste em `tools/testes/` e passa pelo `verificar-tudo.js`, como o resto
do projeto.
