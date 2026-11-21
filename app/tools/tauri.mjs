/* 16/11/2026: o projeto Windows (Tauri) saiu de app/src-tauri e mora em
   "app desktop", na raiz, ao lado do núcleo comum (app) e do Android
   (app android). O Tauri só procura src-tauri dentro da pasta atual;
   TAURI_APP_PATH e TAURI_FRONTEND_PATH dizem onde está cada parte.
   uso: npm run tauri -- build | dev | icon ... */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const desktop = resolve(app, '..', 'app desktop');
if (!existsSync(join(desktop, 'tauri.conf.json'))) {
  console.error(`Projeto Windows não encontrado em ${desktop}`);
  process.exit(1);
}
const cli = join(app, 'node_modules', '@tauri-apps', 'cli', 'tauri.js');
if (!existsSync(cli)) {
  console.error('Tauri CLI ausente; rode npm ci em app');
  process.exit(1);
}
const r = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: app,
  env: { ...process.env, TAURI_APP_PATH: desktop, TAURI_FRONTEND_PATH: app }
});
process.exit(r.status ?? 1);
