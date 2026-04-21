import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { SupplierBadge } from './SupplierBadge';

interface SupplierStats {
  name: string;
  invoicesMonth: number;
  anomalyRate: number;
  trend: 'up' | 'down' | 'flat';
  amountAtStake: number;
}

const TOP_SUPPLIERS: SupplierStats[] = [
  { name: 'CERP', invoicesMonth: 42, anomalyRate: 24, trend: 'up', amountAtStake: 2847 },
  { name: 'BIOGARAN', invoicesMonth: 18, anomalyRate: 22, trend: 'up', amountAtStake: 1653 },
  { name: 'OCP', invoicesMonth: 38, anomalyRate: 15, trend: 'down', amountAtStake: 892 },
  { name: 'ALLIANCE', invoicesMonth: 24, anomalyRate: 9, trend: 'down', amountAtStake: 412 },
  { name: 'ARROW', invoicesMonth: 12, anomalyRate: 7, trend: 'down', amountAtStake: 189 },
];

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  if (trend === 'up') return <TrendingUp className="h-3.5 w-3.5 text-pv-crit-500" />;
  if (trend === 'down') return <TrendingDown className="h-3.5 w-3.5 text-pv-ok-500" />;
  return <Minus className="h-3.5 w-3.5 text-pv-slate-400" />;
}

function rateColor(rate: number): string {
  if (rate >= 20) return 'text-pv-crit-600';
  if (rate >= 10) return 'text-pv-warn-600';
  return 'text-pv-slate-600';
}

export function TopSuppliersCard() {
  return (
    <div className="bg-white border border-pv-ink-100/70 rounded-xl shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-pv-ink-100/50">
        <h2 className="text-[15px] font-semibold tracking-tight text-pv-ink-900">
          Fournisseurs à surveiller
        </h2>
        <p className="text-[12px] text-pv-slate-500 mt-0.5">
          Classés par % anomalies
        </p>
      </div>

      {/* List */}
      <div className="divide-y divide-pv-ink-100/40">
        {TOP_SUPPLIERS.map((s) => (
          <div
            key={s.name}
            className="flex items-center gap-3 px-5 py-3 hover:bg-pv-slate-50 transition-colors cursor-pointer"
          >
            <SupplierBadge supplier={s.name} />

            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-pv-ink-900">{s.name}</div>
              <div className="text-[11px] text-pv-slate-500">
                {s.invoicesMonth} factures ce mois
              </div>
            </div>

            <div className="text-right shrink-0 flex items-center gap-2">
              <div>
                <div className={`text-[16px] font-semibold tabular-nums ${rateColor(s.anomalyRate)}`}>
                  {s.anomalyRate}&nbsp;%
                </div>
                <div className="text-[11px] text-pv-slate-500 tabular-nums">
                  {Math.round(s.amountAtStake).toLocaleString('fr-FR')}&nbsp;€
                </div>
              </div>
              <TrendIcon trend={s.trend} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
