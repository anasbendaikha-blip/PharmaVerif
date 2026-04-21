/**
 * PharmaVerif — Dashboard Header (production, data-driven).
 *
 * Affiche uniquement des informations réelles :
 * - Date du jour (calculée)
 * - Nom de la pharmacie (depuis props, alimenté par l'auth context)
 * - Nom de l'utilisateur connecté (depuis props)
 *
 * Éléments retirés (2026-04-21 — nettoyage mocks résiduels) :
 * - Barre de recherche ⌘K : recherche backend non implémentée
 * - Sélecteur Mois/Trimestre/Année : filtre non fonctionnel
 * - Cloche notifications badge "3" : système notifications non implémenté
 * Ces éléments seront réintégrés quand leurs backends seront prêts.
 */

interface DashboardHeaderProps {
  pharmacyName: string;
  userName: string;
  userRole?: string;
}

export function DashboardHeader({ pharmacyName, userName, userRole }: DashboardHeaderProps) {
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const initials = userName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <header className="bg-white border border-pv-ink-100/70 rounded-xl px-6 py-4 shadow-sm flex items-center gap-5">
      {/* Date + pharmacy */}
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-[0.12em] text-pv-slate-500 font-semibold">
          {today}
        </div>
        <h1 className="text-[17px] font-semibold tracking-tight text-pv-ink-900 truncate">
          {pharmacyName}
        </h1>
      </div>

      {/* User (données réelles du contexte auth) */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pv-ink-700 to-pv-ink-900 text-white grid place-items-center text-[12.5px] font-semibold">
          {initials}
        </div>
        <div className="hidden sm:block leading-tight">
          <div className="text-[12.5px] font-semibold text-pv-ink-900">{userName}</div>
          {userRole && (
            <div className="text-[11px] text-pv-slate-500 capitalize">{userRole}</div>
          )}
        </div>
      </div>
    </header>
  );
}
