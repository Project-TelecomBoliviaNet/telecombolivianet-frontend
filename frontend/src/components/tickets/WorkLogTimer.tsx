import { useState, useEffect, useRef } from 'react';
import { Play, Square, Timer } from 'lucide-react';

interface Props {
  onStop: (hours: number, minutes: number) => void;
}

function fmt(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function WorkLogTimer({ onStop }: Props) {
  const [running, setRunning]   = useState(false);
  const [elapsed, setElapsed]   = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const handleStart = () => { setElapsed(0); setRunning(true); };

  const handleStop = () => {
    setRunning(false);
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    onStop(h, m === 0 ? 1 : m); // at least 1 minute
  };

  return (
    <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5">
      <Timer className="w-4 h-4 text-blue-500 shrink-0" />
      <span className="font-mono text-lg font-semibold text-blue-700 min-w-[6ch]">
        {fmt(elapsed)}
      </span>
      {!running ? (
        <button
          type="button"
          onClick={handleStart}
          className="flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          <Play className="w-3 h-3" /> Iniciar
        </button>
      ) : (
        <button
          type="button"
          onClick={handleStop}
          className="flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
        >
          <Square className="w-3 h-3" /> Detener
        </button>
      )}
      {running && (
        <span className="text-xs text-blue-500 animate-pulse">Registrando tiempo...</span>
      )}
    </div>
  );
}
