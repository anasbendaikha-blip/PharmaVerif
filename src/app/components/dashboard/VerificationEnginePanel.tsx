import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface RuleStats {
  id: number;
  name: string;
  desc: string;
  hits: number;
}

const ENGINE_RULES: RuleStats[] = [
  { id: 1, name: 'Conformité CIP & lots', desc: 'Codes CIP valides, lots déclarés', hits: 0 },
  { id: 2, name: 'Prix unitaires vs historique', desc: 'Dérive >5 % détectée', hits: 3 },
  { id: 3, name: "Seuils d'escompte", desc: 'Escompte contractuel appliqué', hits: 1 },
  { id: 4, name: 'Frais de port & franco', desc: 'Seuil franco respecté', hits: 2 },
  { id: 5, name: 'Remises & RFA', desc: 'Taux contractuels vs facturés', hits: 7 },
  { id: 6, name: 'Tranches volumétriques', desc: 'Paliers déclenchés correctement', hits: 4 },
  { id: 7, name: 'Cohérence EMAC', desc: 'Triangle facture/EMAC/conditions', hits: 2 },
];

export function VerificationEnginePanel() {
  const activeRules = ENGINE_RULES.length;
  const totalHits = ENGINE_RULES.reduce((s, r) => s + r.hits, 0);

  return (
    <div className="bg-white border border-pv-ink-100/70 rounded-xl shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-pv-ink-100/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-pv-ink-900">
              Moteur de vérification
            </h2>
            <p className="text-[12px] text-pv-slate-500 mt-0.5">
              {activeRules} règles actives · {totalHits} détections
            </p>
          </div>
        </div>
      </div>

      {/* Rules list */}
      <div className="divide-y divide-pv-ink-100/40">
        {ENGINE_RULES.map((rule) => {
          const ok = rule.hits === 0;
          return (
            <div key={rule.id} className="flex items-center gap-3 px-5 py-3 hover:bg-pv-slate-50 transition-colors">
              {/* Icon */}
              <div className={`shrink-0 w-8 h-8 rounded-full grid place-items-center ${
                ok ? 'bg-pv-ok-50 text-pv-ok-600' : 'bg-pv-warn-50 text-pv-warn-600'
              }`}>
                {ok
                  ? <CheckCircle2 className="h-4 w-4" />
                  : <AlertCircle className="h-4 w-4" />
                }
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-pv-ink-900 truncate">{rule.name}</div>
                <div className="text-[11px] text-pv-slate-500 truncate">{rule.desc}</div>
              </div>

              {/* Counter */}
              <span className={`text-[12px] font-semibold tabular-nums shrink-0 ${
                ok ? 'text-pv-ok-600' : 'text-pv-warn-600'
              }`}>
                {ok ? 'OK' : `${rule.hits} hits`}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-pv-ink-100/50 flex items-center justify-between">
        <span className="text-[11px] text-pv-slate-500">Dernière exécution : il y a 12 min</span>
        <button className="flex items-center gap-1 text-[12px] font-medium text-pv-ink-500 hover:text-pv-ink-800 transition-colors">
          <RefreshCw className="h-3 w-3" /> Relancer
        </button>
      </div>
    </div>
  );
}
