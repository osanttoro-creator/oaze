import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'live-site');
const output = join(root, 'dist-live');
if (!existsSync(join(source, 'app-v3.html'))) throw new Error('Painel publicado ausente em live-site');
if (!output.startsWith(root + '\\') && !output.startsWith(root + '/')) throw new Error('Destino inválido');

// O conteúdo vem de um snapshot rastreado do /app publicado. O build nativo
// adapta apenas as rotas e o retorno OAuth; não recompõe a interface.
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
cpSync(join(source, 'assets'), join(output, 'assets'), { recursive: true });

function replaceRequired(text, oldValue, newValue, filename) {
  if (!text.includes(oldValue)) throw new Error(`${filename}: marcador esperado ausente: ${oldValue}`);
  return text.replace(oldValue, newValue);
}

/* 01/11/2026: o vídeo premiado do Google Ad Manager (IMA) roda no Windows e
   no site; só os domínios do SDK e do servidor de anúncios entram. */
const ADS = "https://imasdk.googleapis.com https://*.doubleclick.net https://*.googlesyndication.com https://*.googleadservices.com https://*.google.com https://*.gstatic.com";
const policy = "default-src 'self'; script-src 'self' https://imasdk.googleapis.com; style-src 'self' 'unsafe-inline'; " +
  "font-src 'self' data:; img-src 'self' data: blob: https://*.googleusercontent.com https://*.supabase.co https://cdn.brandfetch.io " + ADS + "; " +
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co " + ADS + "; media-src 'self' blob: " + ADS + "; " +
  "object-src 'none'; base-uri 'self'; frame-src " + ADS;
function harden(html, name) {
  let number = 0;
  html = html.replace(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, (_whole, content) => {
    const file = `${name}-${++number}.js`;
    writeFileSync(join(output, 'native', file), content);
    return `<script src="/native/${file}"></script>`;
  });
  return html.replace('</head>', `<meta http-equiv="Content-Security-Policy" content="${policy}">\n</head>`);
}

mkdirSync(join(output, 'native'), { recursive: true });

const routes = ['entrar', 'confirmar-email', 'privacidade', 'termos', 'suporte'];
const routePattern = 'entrar|confirmar-email|privacidade|termos|suporte';
// Páginas de leitura abertas de dentro do painel: no app elas não podem levar
// ao menu de marketing do site (Recursos, Preços, Criar conta) nem às versões
// traduzidas, que não estão no pacote. Ganham uma barra de volta ao painel.
const readingPages = new Set(['privacidade', 'termos', 'suporte']);
const appBar = '<style>.oaze-app-bar{position:sticky;top:0;z-index:20;display:flex;align-items:center;' +
  'min-height:56px;padding:calc(env(safe-area-inset-top,0px) + 6px) max(16px,env(safe-area-inset-right,0px)) 6px max(16px,env(safe-area-inset-left,0px));' +
  'background:rgba(28,51,64,.94);border-bottom:1px solid rgba(240,229,207,.12);backdrop-filter:blur(12px)}' +
  '.oaze-app-bar a{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 14px;border-radius:99px;' +
  'color:#f0e5cf;font-weight:600;text-decoration:none;border:1px solid rgba(95,169,155,.55)}' +
  '.oaze-app-bar a:focus-visible{outline:2px solid #5fa99b;outline-offset:3px}</style>\n' +
  '<nav class="oaze-app-bar" aria-label="Navegação do aplicativo"><a href="/index.html#settings">' +
  '<span aria-hidden="true">‹</span> Voltar ao OAZE</a></nav>';
for (const route of routes) {
  let html = readFileSync(join(source, `${route}.html`), 'utf8');
  if (readingPages.has(route)) {
    html = html.replace(/<header class="topo">[\s\S]*?<\/header>/, appBar);
    html = html.replace(/<footer class="rodape">[\s\S]*?<\/footer>/, '');
    html = html.replace(/<script src="\/assets\/js\/idioma-esfera\.js"[^>]*><\/script>\s*/, '');
    if (!html.includes('class="oaze-app-bar"') || html.includes('class="rodape"')) {
      throw new Error(`${route}.html: cabeçalho ou rodapé do site não foi substituído`);
    }
  }
  html = html.replace(new RegExp(`(href|action)="\\/(${routePattern})(?=["?#])`, 'g'), '$1="/$2.html');
  html = html.replace(/href="\/"/g, 'href="/index.html"');
  // Rotas que só existem no site abrem no navegador do sistema (a ponte intercepta).
  html = html.replace(new RegExp(`(<a\\b[^>]*\\bhref=")\\/(?!assets\\/|native\\/|index\\.html|(?:${routePattern})\\.html)([^"]*)"`, 'g'),
    '$1https://oaze.site/$2"');
  if (html.includes('<script src="/assets/js/site-auth.js"></script>')) {
    html = html.replace('<script src="/assets/js/site-auth.js"></script>',
      '<script src="/assets/js/site-auth.js"></script>\n<script src="/native/bridge.js"></script>');
  } else {
    html = html.replace('</body>', '<script src="/native/bridge.js"></script>\n</body>');
  }
  writeFileSync(join(output, `${route}.html`), harden(html, route));
}

let app = readFileSync(join(source, 'app-v3.html'), 'utf8');
/* 15/11/2026: o marcador não depende mais do carimbo ?v= do script. Ele
   ficou preso em 20261014a quando a página já usava outro carimbo, e o
   pacote nativo deixou de montar sem ninguém perceber. */
{
  const marcador = /<script src="\/assets\/js\/site-auth\.js(?:\?v=[^"]*)?"><\/script>/;
  if (!marcador.test(app)) throw new Error('app-v3.html: marcador esperado ausente: site-auth.js');
  app = app.replace(marcador, (achado) => achado + '\n  <script src="/native/bridge.js"></script>');
}
app = app.replace(/href="\/app"/g, 'href="/index.html"');
writeFileSync(join(output, 'index.html'), harden(app, 'index'));

const backendPath = join(output, 'assets/app/live-backend.js');
let backend = readFileSync(backendPath, 'utf8');
backend = replaceRequired(backend, "const loginUrl = '/entrar?destino='", "const loginUrl = '/entrar.html?destino='", 'live-backend.js');
backend = backend.replaceAll("global.location.replace('/');", "global.location.replace('/entrar.html');");
// O pacote só tem arquivos .html: sem esta troca, /privacidade cairia no painel.
// target=_blank abriria uma janela solta no Windows; dentro do app a leitura
// acontece na mesma tela, com a barra de volta.
function nativeLinks(text) {
  return text
    .replace(/href="\/(privacidade|termos|suporte)(#[\w-]*)?"(?:\s+target="_blank")?(?:\s+rel="noopener noreferrer")?/g, 'href="/$1.html$2"')
    .replace(/href="\/app"/g, 'href="/index.html"');
}
backend = nativeLinks(backend);
if (!backend.includes('href="/privacidade.html"')) throw new Error('live-backend.js: link da política não convertido');
writeFileSync(backendPath, backend);

const appPath = join(output, 'assets/app/app.js');
let appJs = readFileSync(appPath, 'utf8');
appJs = replaceRequired(appJs,
  "if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();",
  "const nativeBoot=()=>Promise.resolve(global.OAZE_NATIVE_AUTH_READY).then(boot);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',nativeBoot);else nativeBoot();",
  'app.js');
appJs = nativeLinks(appJs);
for (const required of ['href="/suporte.html"', 'href="/privacidade.html#direitos"', 'href="/termos.html#acessibilidade"']) {
  if (!appJs.includes(required)) throw new Error(`app.js: link interno não convertido (${required})`);
}
if (/href="\/(suporte|privacidade|termos)[#"]/.test(appJs)) throw new Error('app.js: rota sem .html no pacote');
writeFileSync(appPath, appJs);

// Vite empacota os plugins nativos em um único script clássico, carregado
// depois do SiteAuth e antes do painel.
const bridge = join(root, 'dist-bridge', 'bridge.js');
if (!existsSync(bridge)) throw new Error('Ponte nativa ausente; rode vite.bridge.config.ts antes');
cpSync(bridge, join(output, 'native', 'bridge.js'));

for (const file of readdirSync(output)) {
  if (file === 'app-v3.html') throw new Error('Rota de apresentação inesperada no pacote');
}
for (const file of readdirSync(output).filter((name) => name.endsWith('.html'))) {
  const html = readFileSync(join(output, file), 'utf8');
  for (const match of html.matchAll(/(?:src|href)="\/(assets|native)\/([^"?#]+)[^"]*"/g)) {
    const asset = join(output, match[1], match[2]);
    if (!existsSync(asset)) throw new Error(`${file}: recurso ausente ${match[0]}`);
  }
  if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(html)) throw new Error(`${file}: script inline no pacote`);
}
console.log(`Painel publicado empacotado em ${output}`);
