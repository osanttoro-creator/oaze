import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './design-system';
import './styles/app.css';
import { App } from './App';
import { boot } from './core/boot';

/*
  O arranque é assíncrono porque o cofre nativo é assíncrono: ler os dados antes
  de renderizar evita o piscar de "sem nada" seguido de "tudo aqui", e evita
  pior — gravar em cima do que estava guardado.

  Se o arranque falhar, a tela diz o que falhou. Um painel financeiro que abre
  vazio sem explicação faz a pessoa achar que perdeu tudo.
*/

const root = createRoot(document.getElementById('root') as HTMLElement);

boot().then(
  ({ storageProblem }) => {
    root.render(
      <StrictMode>
        <App storageProblem={storageProblem} />
      </StrictMode>,
    );
  },
  (err: unknown) => {
    root.render(
      <StrictMode>
        <App storageProblem={err instanceof Error ? err : new Error(String(err))} />
      </StrictMode>,
    );
  },
);
