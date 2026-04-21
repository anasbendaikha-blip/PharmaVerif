import { useState } from 'react';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';

interface AlertBannerProps {
  message: string;
  amount: number;
  onAnalyze?: () => void;
}

export function AlertBanner({ message, amount, onAnalyze }: AlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="relative bg-pv-ink-900 text-white rounded-xl px-6 py-4 flex items-center gap-4">
      {/* Icon */}
      <div className="shrink-0 w-10 h-10 rounded-full bg-pv-warn-500/20 grid place-items-center">
        <AlertTriangle className="h-5 w-5 text-amber-300" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-white/90 leading-tight">
          Signalement du jour
        </p>
        <p className="text-[14px] font-semibold text-white mt-0.5 truncate">
          {message}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <div className="text-[26px] font-semibold tabular-nums leading-none">
          {Math.round(amount).toLocaleString('fr-FR')}&nbsp;€
        </div>
        <div className="text-[11px] text-white/60 mt-1">à récupérer</div>
      </div>

      {/* Actions */}
      <button
        onClick={onAnalyze}
        className="shrink-0 flex items-center gap-1.5 text-[13px] font-medium text-white/70 hover:text-white transition-colors ml-2"
      >
        Analyser <ArrowRight className="h-3.5 w-3.5" />
      </button>

      {/* Close */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 text-white/40 hover:text-white/80 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
