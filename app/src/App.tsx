import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, ErrorState } from './design-system';
import { reportHandled } from './core/telemetry';
import { useApp } from './state/store';
import { useUnlocked } from './state/session';
import { usePartitionFailure } from './state/partition';
import { Welcome } from './screens/Welcome';
import { Lock } from './screens/Lock';
import { Shell } from './shell/Shell';

/*
  Uma tela quebrada não pode levar o app inteiro. O limite de erro fica aqui, em
  volta de tudo, e diz a única coisa que importa num app de finanças quando algo
  falha: **os dados continuam salvos**.
*/
class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportHandled(error, `tela: ${info.componentStack?.split('\n')[1]?.trim() ?? 'desconhecida'}`);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <ErrorState
        title="Essa tela não abriu"
        message="Seus dados continuam salvos neste aparelho. Recarregar costuma resolver."
        detail={this.state.error.message}
        action={
          <Button tone="milk" onClick={() => location.reload()}>
            Recarregar
          </Button>
        }
      />
    );
  }
}

export function App({ storageProblem }: { storageProblem?: Error | null }) {
  const hasSpace = useApp((s) => s.workspaces.length > 0 && !!s.activeId);
  const hasPin = useApp((s) => !!s.security.pin);
  const unlocked = useUnlocked();
  const partitionFailure = usePartitionFailure();

  /*
    O cofre certo para esta plataforma não abriu. Em vez de cair em silêncio para
    armazenamento sem cifragem — que é o P2 voltando com outra roupa —, o app
    para e diz. Num painel financeiro, degradar a proteção sem avisar é pior do
    que não abrir.
  */
  if (storageProblem) {
    return (
      <ErrorState
        title="Não consegui abrir o cofre deste aparelho"
        message="Para não guardar seus dados sem proteção, o OAZE preferiu não abrir. Reinicie o aplicativo; se continuar, reinstale."
        detail={storageProblem.message}
        action={
          <Button tone="milk" onClick={() => location.reload()}>
            Tentar de novo
          </Button>
        }
      />
    );
  }

  if (partitionFailure) {
    return (
      <ErrorState
        title="Não consegui trocar de conta"
        message="Para proteger seus dados, o OAZE interrompeu a troca. Seus dados anteriores não foram enviados para outra conta."
        detail={partitionFailure.message}
        action={<Button tone="milk" onClick={() => location.reload()}>Tentar de novo</Button>}
      />
    );
  }

  return (
    <Boundary>
      {!hasSpace ? <Welcome /> : hasPin && !unlocked ? <Lock /> : <Shell />}
    </Boundary>
  );
}
