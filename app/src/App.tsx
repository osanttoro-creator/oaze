import { useApp } from './state/store';
import { useUnlocked } from './state/session';
import { Welcome } from './screens/Welcome';
import { Lock } from './screens/Lock';
import { Shell } from './Shell';

export function App() {
  const hasSpace = useApp((s) => s.workspaces.length > 0 && !!s.activeId);
  const hasPin = useApp((s) => !!s.security.pin);
  const unlocked = useUnlocked();

  if (!hasSpace) return <Welcome />;
  if (hasPin && !unlocked) return <Lock />;
  return <Shell />;
}
