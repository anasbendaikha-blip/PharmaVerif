import { ArrowRight, ChevronRight } from 'lucide-react';
import { SupplierBadge } from './SupplierBadge';

type Severity = 'crit' | 'warn' | 'slate';

interface AnomalyRow {
  supplier: string;
  type: string;
  invoice: string;
  amount: number;
  ageDays: number;
  severity: Severity;
}

interface AnomalyTableProps {
  anomalies: AnomalyRow[];
  onViewAll?: () => void;
}

const BORDER_COLOR: Record<Severity, string> = {
  crit: 'border-l-[var(--pv-crit-500)]',
  warn: 'border-l-[var(--pv-warn-500)]',
  slate: 'border-l-[var(--pv-slate-300)]',
};

function AgeBadge({ days }: { days: number }) {
  const color =
    days <= 7
      ? 'bg-pv-ok-50 text-pv-ok-700'
      : days <= 30
        ? 'bg-pv-warn-50 text-pv-warn-700'
        : 'bg-pv-crit-50 text-pv-crit-700';
  return (
    <span className={`text-[11px] font-medium tabular-nums px-1.5 py-0.5 rounded ${color}`}>
      {days}j
    </span>
  );
}

export function AnomalyTable({ anomalies, onViewAll }: AnomalyTableProps) {
  const sorted = [...anomalies].sort((a, b) => b.amount - a.amount).slice(0, 5);

  return (
    <div className="bg-white border border-pv-ink-100/70 rounded-xl shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-pv-ink-100/50">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[15px] font-semibold tracking-tight text-pv-ink-900">
            Anomalies prioritaires
          </h2>
          <span className="text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded bg-pv-crit-50 text-pv-crit-600">
            {anomalies.length}
          </span>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="flex items-center gap-1 text-[12px] font-medium text-pv-ink-500 hover:text-pv-ink-800 transition-colors"
          >
            Voir tout <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-pv-ink-100/50">
              <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-pv-slate-500">
                Fournisseur
              </th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-pv-slate-500">
                Type
              </th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-pv-slate-500">
                Facture
              </th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-pv-slate-500 text-right">
                Montant
              </th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-pv-slate-500 text-center">
                Âge
              </th>
              <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-pv-slate-500 text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={row.invoice}
                className={`border-l-[3px] ${BORDER_COLOR[row.severity]} hover:bg-pv-slate-50 transition-colors`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <SupplierBadge supplier={row.supplier} size="sm" />
                    <span className="text-[13px] font-medium text-pv-ink-900">{row.supplier}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-[13px] text-pv-ink-800 max-w-[200px] truncate">
                  {row.type}
                </td>
                <td className="px-3 py-3">
                  <code className="text-[12px] text-pv-slate-500 font-mono">{row.invoice}</code>
                </td>
                <td className="px-3 py-3 text-right">
                  <span className={`text-[14px] font-semibold tabular-nums ${
                    row.severity === 'crit' ? 'text-pv-crit-600' : row.severity === 'warn' ? 'text-pv-warn-600' : 'text-pv-slate-600'
                  }`}>
                    {Math.round(row.amount).toLocaleString('fr-FR')}&nbsp;€
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  <AgeBadge days={row.ageDays} />
                </td>
                <td className="px-5 py-3 text-right">
                  <button className={`inline-flex items-center gap-1 text-[12px] font-medium px-2.5 py-1 rounded-md transition-colors ${
                    row.severity === 'crit'
                      ? 'bg-pv-ink-900 text-white hover:bg-pv-ink-800'
                      : 'text-pv-ink-600 hover:bg-pv-ink-50'
                  }`}>
                    {row.severity === 'crit' ? 'Contester' : 'Analyser'}
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export type { AnomalyRow, Severity };
