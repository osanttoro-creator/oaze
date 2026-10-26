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

const policy = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
  "font-src 'self' data:; img-src 'self' data: blob: https://*.googleusercontent.com https://*.supabase.co; " +
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co; media-src 'self' blob:; " +
  "object-src 'none'; base-uri 'self'; frame-src 'none'";
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

const routes = ['entrar', 'cadastro', 'recuperar-senha', 'redefinir-senha', 'confirmar-email', 'privacidade', 'termos', 'suporte'];
for (const route of routes) {
  let html = readFileSync(join(source, `${route}.html`), 'utf8');
  html = html.replace(/(href|action)="\/(entrar|cadastro|recuperar-senha|redefinir-senha|confirmar-email|privacidade|termos|suporte)(?=["?#])/g, '$1="/$2.html');
  html = html.replace(/href="\/"/g, 'href="/index.html"');
  if (html.includes('<script src="/assets/js/site-auth.js"></script>')) {
    html = html.replace('<script src="/assets/js/site-auth.js"></script>',
      '<script src="/assets/js/site-auth.js"></script>\n<script src="/native/bridge.js"></script>');
  }
  writeFileSync(join(output, `${route}.html`), harden(html, route));
}

let app = readFileSync(join(source, 'app-v3.html'), 'utf8');
app = replaceRequired(app, '<script src="/assets/js/site-auth.js?v=20261014a"></script>',
  '<script src="/assets/js/site-auth.js?v=20261014a"></script>\n  <script src="/native/bridge.js"></script>', 'app-v3.html');
writeFileSync(join(output, 'index.html'), harden(app, 'index'));

const backendPath = join(output, 'assets/app/live-backend.js');
let backend = readFileSync(backendPath, 'utf8');
backend = replaceRequired(backend, "const loginUrl = '/entrar?destino='", "const loginUrl = '/entrar.html?destino='", 'live-backend.js');
backend = backend.replaceAll("global.location.replace('/');", "global.location.replace('/entrar.html');");
writeFileSync(backendPath, backend);

const appPath = join(output, 'assets/app/app.js');
let appJs = readFileSync(appPath, 'utf8');
appJs = replaceRequired(appJs,
  "if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();",
  "const nativeBoot=()=>Promise.resolve(global.OAZE_NATIVE_AUTH_READY).then(boot);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',nativeBoot);else nativeBoot();",
  'app.js');
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
