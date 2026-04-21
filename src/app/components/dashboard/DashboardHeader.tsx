import { useState } from 'react';
import { Search, Bell } from 'lucide-react';

interface DashboardHeaderProps {
  pharmacyName: string;
  userName: string;
}

type Period = 'month' | 'quarter' | 'year';

function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const items: { id: Period; label: string }[] = [
    { id: 'month', label: 'Mois' },
    { id: 'quarter', label: 'Trimestre' },
    { id: 'year', label: 'Année' },
  ];
  return (
    <div className="h-9 inline-flex items-center gap-0.5 bg-pv-slate-100 border border-pv-ink-100 rounded-lg p-0.5">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onChange(it.id)}
          className={`px-3 h-8 rounded-md text-[12.5px] font-medium transition-colors ${
            value === it.id
              ? 'bg-white text-pv-ink-900 shadow-sm'
              : 'text-pv-slate-600 hover:text-pv-ink-800'
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function DashboardHeader({ pharmacyName, userName }: DashboardHeaderProps) {
  const [period, setPeriod] = useState<Period>('month');
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const initials = userName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="bg-white border-b border-pv-ink-100/70 px-6 py-3 flex items-center gap-5">
      {/* Left: date + pharmacy */}
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-[0.12em] text-pv-slate-500 font-semibold">
          {today}
        </div>
        <h1 className="text-[17px] font-semibold tracking-tight text-pv-ink-900 truncate">
          {pharmacyName}
        </h1>
      </div>

      <div className="flex-1" />

      {/* Search */}
      <div className="relative hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-pv-slate-400" />
        <input
          placeholder="Rechercher facture, fournisseur…"
          className="w-[320px] pl-9 pr-14 h-9 rounded-lg bg-pv-slate-50 border border-pv-ink-100 text-[13px] placeholder:text-pv-slate-400 focus:outline-none focus:bg-white focus:border-pv-ink-400 focus:ring-2 focus:ring-pv-ink-900/10 transition-colors"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10.5px] text-pv-slate-500 bg-white border border-pv-ink-100 px-1.5 py-0.5 rounded">
          ⌘K
        </kbd>
      </div>

      {/* Period */}
      <PeriodSelector value={period} onChange={setPeriod} />

      {/* Notifications */}
      <button className="relative h-9 w-9 rounded-lg bg-pv-slate-50 border border-pv-ink-100 text-pv-ink-700 hover:bg-white hover:border-pv-ink-400 grid place-items-center transition-colors">
        <Bell className="h-[15px] w-[15px]" />
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-pv-crit-500 text-white text-[10.5px] font-semibold tabular-nums border-2 border-white">
          3
        </span>
      </button>

      {/* User */}
      <div className="flex items-center gap-2.5 pl-4 border-l border-pv-ink-100/70">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pv-ink-700 to-pv-ink-900 text-white grid place-items-center text-[12.5px] font-semibold">
          {initials}
        </div>
        <div className="hidden sm:block leading-tight">
          <div className="text-[12.5px] font-semibold text-pv-ink-900">{userName}</div>
          <div className="text-[11px] text-pv-slate-500">Titulaire</div>
        </div>
      </div>
    </header>
  );
}
