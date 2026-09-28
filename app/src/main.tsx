import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/app.css';
import { App } from './App';
import { installPrivacyCurtain } from './platform';
import { installAutoLock, unlock } from './state/session';
import { flushSave, getState, setState } from './state/store';
import { demoWorkspace } from './domain/seed';

installPrivacyCurtain();
installAutoLock();
window.addEventListener('pagehide', flushSave);

// "Experimentar" no site abre o exemplo direto — só em aparelho sem nenhum dado.
if (new URLSearchParams(location.search).has('demo') && getState().workspaces.length === 0) {
  const w = demoWorkspace();
  setState((s) => ({ ...s, owner: { name: 'Ana Souza' }, plan: 'mensal', workspaces: [w], activeId: w.id }));
  unlock();
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
