import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const RECOVERY_DATA = [
  { month: 'Mai 25', confirmed: 1200, pending: 340 },
  { month: 'Juin', confirmed: 1680, pending: 420 },
  { month: 'Juil.', confirmed: 2100, pending: 380 },
  { month: 'Août', confirmed: 1890, pending: 560 },
  { month: 'Sept.', confirmed: 2340, pending: 410 },
  { month: 'Oct.', confirmed: 2780, pending: 620 },
  { month: 'Nov.', confirmed: 3120, pending: 480 },
  { month: 'Déc.', confirmed: 2890, pending: 720 },
  { month: 'Janv.', confirmed: 3450, pending: 540 },
  { month: 'Févr.', confirmed: 3680, pending: 890 },
  { month: 'Mars', confirmed: 4020, pending: 670 },
  { month: 'Avr. 26', confirmed: 3247, pending: 1130 },
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const confirmed = payload.find((p: any) => p.dataKey === 'confirmed')?.value || 0;
  const pending = payload.find((p: any) => p.dataKey === 'pending')?.value || 0;
  return (
    <div className="bg-white border border-pv-ink-100 rounded-lg shadow-lg px-4 py-3 text-[12px]">
      <div className="font-semibold text-pv-ink-900 mb-1.5">{label}</div>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full bg-pv-ok-500" />
        <span className="text-pv-slate-600">Confirmé</span>
        <span className="font-semibold tabular-nums text-pv-ink-900 ml-auto">
          {confirmed.toLocaleString('fr-FR')} €
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-400" />
        <span className="text-pv-slate-600">En contestation</span>
        <span className="font-semibold tabular-nums text-pv-ink-900 ml-auto">
          {pending.toLocaleString('fr-FR')} €
        </span>
      </div>
      <div className="mt-1.5 pt-1.5 border-t border-pv-ink-100/50 flex justify-between">
        <span className="text-pv-slate-500">Total</span>
        <span className="font-semibold tabular-nums text-pv-ink-900">
          {(confirmed + pending).toLocaleString('fr-FR')} €
        </span>
      </div>
    </div>
  );
}

export function RecoveryChart() {
  const totalConfirmed = RECOVERY_DATA.reduce((s, d) => s + d.confirmed, 0);

  return (
    <div className="bg-white border border-pv-ink-100/70 rounded-xl shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-pv-ink-100/50 flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-pv-ink-900">
            Évolution des récupérations
          </h2>
          <p className="text-[12px] text-pv-slate-500 mt-0.5">12 derniers mois</p>
        </div>
        <div className="text-right">
          <div className="text-[22px] font-semibold tabular-nums text-pv-ink-900 leading-none">
            {totalConfirmed.toLocaleString('fr-FR')}&nbsp;€
          </div>
          <div className="text-[11px] text-pv-slate-500 mt-0.5">récupéré cumulé</div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-4 py-4" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={RECOVERY_DATA} barGap={0} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--pv-slate-200)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: 'var(--pv-slate-500)' }}
              axisLine={{ stroke: 'var(--pv-slate-200)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--pv-slate-500)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--pv-slate-100)', radius: 4 }} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, color: 'var(--pv-slate-600)' }}
              formatter={(value: string) => (
                <span className="text-pv-slate-600 ml-1">{value}</span>
              )}
            />
            <Bar
              dataKey="confirmed"
              name="Confirmé"
              fill="var(--pv-ok-500)"
              stackId="a"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="pending"
              name="En contestation"
              fill="#f59e0b"
              stackId="a"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
