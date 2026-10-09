import { useState, type FormEvent } from 'react';
import { Button, Card, Input, Loading } from '../design-system';
import { hasAccountBackend, hasSyncBackend } from '../core/api/client';
import {
  sendMagicLink,
  sendPasswordReset,
  signInWithPassword,
  signInWithProvider,
  signOut,
  signUp,
  useAuth,
} from '../core/auth';
import { storageKind, storageLabel } from '../core/storage';
import { sync, useSyncStatus } from '../core/sync/engine';
import { toast } from '../state/route';

/*
  A conta OAZE: a mesma em Android, iPhone, Windows e Mac.

  Duas coisas que a tela precisa dizer, e diz:

  - **sem conta o app funciona inteiro**, só fica isolado no aparelho. Conta é
    sincronização, não licença de uso — é promessa do produto desde o OAZE 1;
  - **onde os dados estão guardados agora**, em palavras verdadeiras. No
    navegador não há cifragem, e esconder isso seria mentir sobre proteção.
*/

type Mode = 'entrar' | 'criar';

export function Account() {
  const auth = useAuth();
  const status = useSyncStatus();
  const [mode, setMode] = useState<Mode>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const syncReady = hasSyncBackend();

  if (!hasAccountBackend()) {
    return (
      <Card title="Conta">
        <p className="ds-muted">
          Este build foi compilado sem servidor, então não há conta nem sincronização. O app funciona
          inteiro mesmo assim: tudo fica guardado neste aparelho.
        </p>
        <p className="ds-small ds-muted">{storageLabel()}</p>
      </Card>
    );
  }

  const guard = async (what: () => Promise<void>, ok: string) => {
    setBusy(true);
    setError(null);
    try {
      await what();
      toast(ok);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não consegui agora.');
    } finally {
      setBusy(false);
    }
  };

  if (auth.status === 'signed-in') {
    return (
      <Card title="Conta">
        <p>
          Você está em <strong>{auth.name || auth.email}</strong>.
        </p>
        <p className="ds-small ds-muted">
          {!syncReady
            ? 'A conta está conectada. A sincronização financeira aguarda a validação do banco e dos aparelhos; os dados seguem neste dispositivo.'
            : status.phase === 'offline'
            ? `Sem rede. ${status.pending} ${status.pending === 1 ? 'mudança espera' : 'mudanças esperam'} para subir.`
            : status.phase === 'syncing'
              ? 'Sincronizando agora…'
              : status.pending
                ? `${status.pending} ${status.pending === 1 ? 'mudança para subir' : 'mudanças para subir'}.`
                : status.lastSyncAt
                  ? `Tudo sincronizado às ${new Date(status.lastSyncAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`
                  : 'Tudo sincronizado.'}
        </p>
        {status.notice && <p className="ds-small">{status.notice}</p>}
        {status.error && <p className="ds-field-error">{status.error}</p>}
        <p className="ds-small ds-muted">{storageLabel()}</p>
        <div className="ds-row" style={{ gap: 'var(--space-6)', flexWrap: 'wrap' }}>
          {syncReady && (
            <Button tone="ghost" onClick={() => void sync()} busy={status.phase === 'syncing'}>
              Sincronizar agora
            </Button>
          )}
          <Button tone="line" onClick={() => void guard(() => signOut(), 'Você saiu desta sessão.')}>
            Sair deste aparelho
          </Button>
          <Button
            tone="line"
            onClick={() => void guard(() => signOut(true), 'Você saiu de todos os aparelhos.')}
          >
            Sair de todos
          </Button>
        </div>
        <p className="ds-small ds-muted">
          Sair encerra a sessão. Os dados locais continuam neste aparelho e devem ser protegidos com PIN.
        </p>
      </Card>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'criar') {
      void guard(async () => {
        const { needsConfirmation } = await signUp(email, password, name);
        if (needsConfirmation) throw new Error('Conta criada. Confirme o e-mail que acabamos de enviar.');
      }, 'Conta criada. A sincronização financeira ainda está em preparação.');
      return;
    }
    void guard(() => signInWithPassword(email, password), 'Você entrou na sua conta OAZE.');
  };

  return (
    <Card title="Conta">
      <p className="ds-muted">
        Use a mesma conta OAZE do site. A sincronização dos dados financeiros entre aparelhos
        ainda está em validação. <strong>Sem conta o app funciona inteiro</strong> e guarda os dados aqui.
      </p>
      <p className="ds-small ds-muted">{storageLabel()}</p>

      {busy && <Loading label="Falando com o servidor" size={48} />}

      <form onSubmit={submit} className="ds-stack" style={{ display: 'grid', gap: 'var(--space-7)' }}>
        {mode === 'criar' && (
          <Input label="Seu nome" value={name} autoComplete="name" onChange={(e) => setName(e.target.value)} required />
        )}
        <Input
          label="E-mail"
          type="email"
          value={email}
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Senha"
          type="password"
          value={password}
          autoComplete={mode === 'criar' ? 'new-password' : 'current-password'}
          minLength={8}
          hint={mode === 'criar' ? 'Pelo menos 8 caracteres.' : undefined}
          error={error}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button tone="milk" type="submit" block busy={busy}>
          {mode === 'criar' ? 'Criar conta' : 'Entrar'}
        </Button>
      </form>

      <div className="ds-row" style={{ gap: 'var(--space-6)', flexWrap: 'wrap', marginTop: 'var(--space-7)' }}>
        <Button tone="ghost" size="s" onClick={() => setMode(mode === 'entrar' ? 'criar' : 'entrar')}>
          {mode === 'entrar' ? 'Criar uma conta' : 'Já tenho conta'}
        </Button>
        <Button
          tone="ghost"
          size="s"
          onClick={() => void guard(() => sendMagicLink(email), 'Link enviado. Confira seu e-mail.')}
          disabled={!email}
        >
          Entrar por link no e-mail
        </Button>
        {mode === 'entrar' && (
          <Button
            tone="ghost"
            size="s"
            onClick={() => void guard(() => sendPasswordReset(email), 'Enviamos as instruções por e-mail.')}
            disabled={!email}
          >
            Esqueci a senha
          </Button>
        )}
      </div>

      {/* Google e Apple andam juntos: a diretriz 4.8 da App Store exige Entrar
          com a Apple quando existe login social. */}
      <div className="ds-row" style={{ gap: 'var(--space-6)', flexWrap: 'wrap', marginTop: 'var(--space-7)' }}>
        <Button tone="line" onClick={() => void guard(() => signInWithProvider('google'), 'Abrindo o Google…')}>
          Continuar com o Google
        </Button>
        <Button tone="line" onClick={() => void guard(() => signInWithProvider('apple'), 'Abrindo a Apple…')}>
          Continuar com a Apple
        </Button>
      </div>

      {storageKind() === 'browser' && (
        <p className="ds-small ds-muted" style={{ marginTop: 'var(--space-7)' }}>
          Neste navegador o PIN protege a tela, não o arquivo. No aplicativo instalado os dados ficam
          cifrados, com a chave no cofre do sistema.
        </p>
      )}
    </Card>
  );
}
