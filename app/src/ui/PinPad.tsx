import { useEffect } from 'react';
import { Icon } from './Icon';

/** Teclado de PIN. No desktop também aceita o teclado físico. */
export function PinPad({ value, onChange, onDone, onBio, shake, disabled }: {
  value: string;
  onChange: (v: string) => void;
  onDone: (pin: string) => void;
  onBio?: () => void;
  shake?: boolean;
  disabled?: boolean;
}) {
  const press = (k: string) => {
    if (disabled) return;
    if (k === '⌫') return onChange(value.slice(0, -1));
    if (value.length >= 6) return;
    const next = value + k;
    onChange(next);
    if (next.length === 6) setTimeout(() => onDone(next), 120);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('⌫');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <>
      <div className={shake ? 'pin-dots shake' : 'pin-dots'} aria-label={`${value.length} de 6 números`} role="status">
        {Array.from({ length: 6 }, (_, i) => <i key={i} className={i < value.length ? 'on' : ''} />)}
      </div>
      <div className="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
          <button key={k} type="button" onClick={() => press(k)} disabled={disabled}>{k}</button>
        ))}
        {onBio ? (
          <button type="button" className="bare" onClick={onBio} aria-label="Usar biometria"><Icon name="scan-face" size={28} /></button>
        ) : <span />}
        <button type="button" onClick={() => press('0')} disabled={disabled}>0</button>
        <button type="button" className="bare" onClick={() => press('⌫')} aria-label="Apagar"><Icon name="delete" size={26} /></button>
      </div>
    </>
  );
}
