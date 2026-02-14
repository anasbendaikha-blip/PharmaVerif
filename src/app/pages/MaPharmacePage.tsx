/**
 * PharmaVerif - Page Ma Pharmacie (configuration & settings)
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Page de configuration statique organisee en 4 onglets :
 *  1. Informations  — fiche pharmacie + stats resumees
 *  2. Conditions commerciales — accords labo actifs
 *  3. Parametres de verification — seuils d'alerte
 *  4. Historique commercial — EMAC + derniers releves
 */

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../components/ui/page-header';
import { StatCard } from '../components/ui/stat-card';
import { DataTable, type DataTableColumn } from '../components/ui/data-table';
import { StatusBadge } from '../components/ui/status-badge';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { Input } from '../components/ui/input';
import { Alert, AlertDescription } from '../components/ui/alert';
import {
  Building2,
  Users,
  FlaskConical,
  Factory,
  FileText,
  ClipboardList,
  Settings,
  Save,
  ExternalLink,
  AlertCircle,
  Info,
  Loader2,
  ChevronRight,
  Pencil,
} from 'lucide-react';
import { isApiMode } from '../api/config';
import { pharmacyApi } from '../api/pharmacyApi';
import { laboratoiresApi } from '../api/laboratoiresApi';
import { emacApi } from '../api/emacApi';
import { formatCurrency, formatDateShortFR } from '../utils/formatNumber';
import { toast } from 'sonner';
import { ConditionsCommercialesForm } from '../components/ConditionsCommercialesForm';
import type {
  PharmacyResponse,
  PharmacyStats,
  LaboratoireResponse,
  AccordCommercialResponse,
  EMACDashboardStats,
  EMACResponse,
} from '../api/types';

// ========================================
// TYPES
// ========================================

interface MaPharmaciePageProps {
  onNavigate: (page: string) => void;
}

interface VerificationParams {
  seuil_warning: number;
  seuil_critique: number;
  frequence_rapport: 'quotidien' | 'hebdomadaire' | 'mensuel' | 'desactive';
}

const VERIFICATION_PARAMS_KEY = 'pharmaverif_verification_params';

const DEFAULT_PARAMS: VerificationParams = {
  seuil_warning: 100,
  seuil_critique: 500,
  frequence_rapport: 'hebdomadaire',
};

function loadVerificationParams(): VerificationParams {
  try {
    const saved = localStorage.getItem(VERIFICATION_PARAMS_KEY);
    if (saved) return { ...DEFAULT_PARAMS, ...JSON.parse(saved) };
  } catch {
    // fallback
  }
  return { ...DEFAULT_PARAMS };
}

// ========================================
// COMPONENT
// ========================================

export function MaPharmacePage({ onNavigate }: MaPharmaciePageProps) {
  const apiMode = isApiMode();

  // Tab 1 — Informations
  const [pharmacy, setPharmacy] = useState<PharmacyResponse | null>(null);
  const [pharmacyStats, setPharmacyStats] = useState<PharmacyStats | null>(null);
  const [formData, setFormData] = useState({
    nom: '',
    adresse: '',
    siret: '',
    titulaire: '',
  });
  const [savingPharmacy, setSavingPharmacy] = useState(false);

  // Tab 2 — Conditions commerciales
  const [laboratoires, setLaboratoires] = useState<LaboratoireResponse[]>([]);
  const [accords, setAccords] = useState<Record<number, AccordCommercialResponse[]>>({});
  const [loadingAccords, setLoadingAccords] = useState(false);
  const [editingLaboId, setEditingLaboId] = useState<number | null>(null);

  // Tab 3 — Parametres
  const [params, setParams] = useState<VerificationParams>(loadVerificationParams);

  // Tab 4 — Historique EMAC
  const [emacStats, setEmacStats] = useState<EMACDashboardStats | null>(null);
  const [emacList, setEmacList] = useState<EMACResponse[]>([]);

  // Global
  const [loading, setLoading] = useState(true);

  // ==================== LOAD DATA ====================

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (apiMode) {
        const [pharmacyData, statsData] = await Promise.all([
          pharmacyApi.getMyPharmacy().catch(() => null),
          pharmacyApi.getPharmacyStats().catch(() => null),
        ]);

        if (pharmacyData) {
          setPharmacy(pharmacyData);
          setFormData({
            nom: pharmacyData.nom || '',
            adresse: pharmacyData.adresse || '',
            siret: pharmacyData.siret || '',
            titulaire: pharmacyData.titulaire || '',
          });
        }
        if (statsData) setPharmacyStats(statsData);

        // Load laboratoires + accords
        try {
          const labos = await laboratoiresApi.list(true);
          setLaboratoires(labos);

          // Load accords for each labo (in parallel)
          setLoadingAccords(true);
          const accordsMap: Record<number, AccordCommercialResponse[]> = {};
          const results = await Promise.allSettled(
            labos.map((l) => laboratoiresApi.listAccords(l.id, true))
          );
          results.forEach((result, i) => {
            if (result.status === 'fulfilled') {
              accordsMap[labos[i].id] = result.value;
            }
          });
          setAccords(accordsMap);
          setLoadingAccords(false);
        } catch {
          // Labos non disponibles
        }

        // Load EMAC stats + recent list
        try {
          const [eStats, eList] = await Promise.all([
            emacApi.getDashboardStats(),
            emacApi.list({ page: 1, page_size: 5 }),
          ]);
          setEmacStats(eStats);
          setEmacList(eList.emacs);
        } catch {
          // EMAC non disponible
        }
      }
    } catch (err) {
      console.error('Erreur chargement Ma Pharmacie:', err);
    } finally {
      setLoading(false);
    }
  }, [apiMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ==================== HANDLERS ====================

  const handleSavePharmacy = async () => {
    if (!apiMode) return;
    setSavingPharmacy(true);
    try {
      const updated = await pharmacyApi.updateMyPharmacy({
        nom: formData.nom,
        adresse: formData.adresse || null,
        siret: formData.siret || null,
        titulaire: formData.titulaire || null,
      });
      setPharmacy(updated);
      toast.success('Informations pharmacie mises a jour');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSavingPharmacy(false);
    }
  };

  const handleSaveParams = () => {
    localStorage.setItem(VERIFICATION_PARAMS_KEY, JSON.stringify(params));
    toast.success('Parametres de verification sauvegardes');
  };

  // ==================== PLAN BADGE ====================

  const planLabel = (plan?: string) => {
    switch (plan) {
      case 'enterprise':
        return { text: 'Enterprise', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' };
      case 'pro':
        return { text: 'Pro', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' };
      default:
        return { text: 'Gratuit', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' };
    }
  };

  const plan = planLabel(pharmacy?.plan);

  // ==================== EMAC TABLE COLUMNS ====================

  const emacColumns: DataTableColumn<EMACResponse>[] = [
    {
      key: 'reference',
      header: 'Reference',
      render: (row) => (
        <span className="font-medium text-foreground">
          {row.reference || `EMAC-${row.id}`}
        </span>
      ),
    },
    {
      key: 'laboratoire',
      header: 'Laboratoire',
      hideOnMobile: true,
      render: (row) => (
        <span className="text-muted-foreground">
          {row.laboratoire?.nom || '\u2014'}
        </span>
      ),
    },
    {
      key: 'periode',
      header: 'Periode',
      hideOnMobile: true,
      render: (row) => (
        <span className="text-muted-foreground text-sm tabular-nums">
          {formatDateShortFR(row.periode_debut)} — {formatDateShortFR(row.periode_fin)}
        </span>
      ),
    },
    {
      key: 'statut',
      header: 'Statut',
      align: 'center' as const,
      render: (row) => {
        const variants: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
          conforme: 'success',
          ecart_detecte: 'error',
          anomalie: 'error',
          en_cours: 'warning',
          non_verifie: 'default',
        };
        const labels: Record<string, string> = {
          conforme: 'Conforme',
          ecart_detecte: 'Ecart',
          anomalie: 'Anomalie',
          en_cours: 'En cours',
          non_verifie: 'Non verifie',
        };
        return (
          <StatusBadge
            label={labels[row.statut_verification] || row.statut_verification}
            variant={variants[row.statut_verification] || 'default'}
          />
        );
      },
    },
    {
      key: 'montant',
      header: 'Avantages',
      align: 'right' as const,
      render: (row) => (
        <span className="font-medium tabular-nums">
          {formatCurrency(row.total_avantages_declares)}
        </span>
      ),
    },
  ];

  // ==================== RENDER ====================

  return (
    <div className="space-y-6">
      {/* ===== PAGE HEADER ===== */}
      <PageHeader
        title="Ma Pharmacie"
        description="Informations, conditions commerciales et parametres de votre pharmacie"
        icon={<Building2 className="h-5 w-5" />}
      />

      {/* ===== TABS ===== */}
      <Tabs defaultValue="informations">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="informations" className="gap-1.5">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Informations</span>
          </TabsTrigger>
          <TabsTrigger value="conditions" className="gap-1.5">
            <FlaskConical className="h-4 w-4" />
            <span className="hidden sm:inline">Conditions</span>
          </TabsTrigger>
          <TabsTrigger value="parametres" className="gap-1.5">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Parametres</span>
          </TabsTrigger>
          <TabsTrigger value="historique" className="gap-1.5">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Historique</span>
          </TabsTrigger>
        </TabsList>

        {/* ==================== TAB 1: INFORMATIONS ==================== */}
        <TabsContent value="informations" className="space-y-6 mt-4">
          {/* Pharmacy form */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Fiche pharmacie</CardTitle>
                {pharmacy && (
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${plan.className}`}
                  >
                    {plan.text}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!apiMode ? (
                <Alert variant="info">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    En mode demo, les informations pharmacie ne sont pas disponibles.
                    Connectez un backend pour gerer votre pharmacie.
                  </AlertDescription>
                </Alert>
              ) : loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pharm-nom">Nom de la pharmacie</Label>
                      <Input
                        id="pharm-nom"
                        value={formData.nom}
                        onChange={(e) => setFormData((p) => ({ ...p, nom: e.target.value }))}
                        disabled={!apiMode}
                        placeholder="Pharmacie Centrale"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pharm-siret">SIRET</Label>
                      <Input
                        id="pharm-siret"
                        value={formData.siret}
                        onChange={(e) => setFormData((p) => ({ ...p, siret: e.target.value }))}
                        disabled={!apiMode}
                        placeholder="123 456 789 00012"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pharm-adresse">Adresse</Label>
                    <Input
                      id="pharm-adresse"
                      value={formData.adresse}
                      onChange={(e) => setFormData((p) => ({ ...p, adresse: e.target.value }))}
                      disabled={!apiMode}
                      placeholder="12 Rue de la Sante, 75013 Paris"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pharm-titulaire">Titulaire</Label>
                    <Input
                      id="pharm-titulaire"
                      value={formData.titulaire}
                      onChange={(e) => setFormData((p) => ({ ...p, titulaire: e.target.value }))}
                      disabled={!apiMode}
                      placeholder="Dr. Martin Dupont"
                    />
                  </div>

                  {apiMode && (
                    <div className="pt-2">
                      <Button
                        onClick={handleSavePharmacy}
                        disabled={savingPharmacy}
                        className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {savingPharmacy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Sauvegarder
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mini stat cards */}
          {apiMode && pharmacyStats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatCard
                label="Utilisateurs"
                value={pharmacyStats.nb_users}
                icon={<Users className="h-4 w-4" />}
                variant="blue"
                loading={loading}
              />
              <StatCard
                label="Grossistes"
                value={pharmacyStats.nb_grossistes}
                icon={<Factory className="h-4 w-4" />}
                variant="green"
                loading={loading}
              />
              <StatCard
                label="Laboratoires"
                value={pharmacyStats.nb_laboratoires}
                icon={<FlaskConical className="h-4 w-4" />}
                variant="purple"
                loading={loading}
              />
              <StatCard
                label="Factures labo"
                value={pharmacyStats.nb_factures_labo}
                icon={<FileText className="h-4 w-4" />}
                variant="orange"
                loading={loading}
              />
              <StatCard
                label="EMAC"
                value={pharmacyStats.nb_emacs}
                icon={<ClipboardList className="h-4 w-4" />}
                variant="default"
                loading={loading}
              />
            </div>
          )}
        </TabsContent>

        {/* ==================== TAB 2: CONDITIONS COMMERCIALES ==================== */}
        <TabsContent value="conditions" className="space-y-6 mt-4">
          {!apiMode ? (
            <Alert variant="info">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium">Disponible en mode connecte</p>
                <p className="text-sm mt-1 opacity-80">
                  Connectez un backend pour consulter vos conditions commerciales.
                </p>
              </AlertDescription>
            </Alert>
          ) : loadingAccords || loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : laboratoires.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/20 w-fit mx-auto mb-3">
                  <FlaskConical className="h-8 w-8 text-purple-500" />
                </div>
                <p className="font-medium text-foreground">Aucun laboratoire configure</p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Ajoutez vos laboratoires et leurs accords commerciaux pour commencer.
                </p>
                <Button
                  onClick={() => onNavigate('fournisseurs')}
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <ExternalLink className="h-4 w-4" />
                  Configurer les fournisseurs
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {laboratoires.map((labo) => {
                const laboAccords = accords[labo.id] || [];
                if (laboAccords.length === 0) return null;

                return laboAccords.map((accord) => (
                  <Card key={accord.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <FlaskConical className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            {labo.nom}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {accord.nom}
                            {accord.date_fin && (
                              <> &middot; Jusqu'au {formatDateShortFR(accord.date_fin)}</>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingLaboId(labo.id)}
                            className="gap-1.5 text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Modifier
                          </Button>
                          <Badge variant="outline">
                            {accord.actif ? 'Actif' : 'Inactif'}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        {/* Tranche A */}
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Tranche A (generiques)</p>
                          <p className="font-semibold text-foreground">
                            Cible : {accord.tranche_a_cible}%
                          </p>
                          <p className="text-muted-foreground">
                            {accord.tranche_a_pct_ca}% du CA
                          </p>
                        </div>

                        {/* Tranche B */}
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Tranche B (princeps)</p>
                          <p className="font-semibold text-foreground">
                            Cible : {accord.tranche_b_cible}%
                          </p>
                          <p className="text-muted-foreground">
                            {accord.tranche_b_pct_ca}% du CA
                          </p>
                        </div>

                        {/* OTC */}
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">OTC / Paramedical</p>
                          <p className="font-semibold text-foreground">
                            Cible : {accord.otc_cible}%
                          </p>
                        </div>

                        {/* Escompte */}
                        {accord.escompte_applicable && (
                          <div className="p-3 bg-success-light rounded-lg">
                            <p className="text-xs text-success mb-1">
                              Escompte
                            </p>
                            <p className="font-semibold text-foreground">
                              {accord.escompte_pct}% sous {accord.escompte_delai_jours}j
                            </p>
                          </div>
                        )}

                        {/* Franco */}
                        {accord.franco_seuil_ht > 0 && (
                          <div className="p-3 bg-info-light rounded-lg">
                            <p className="text-xs text-info mb-1">
                              Franco de port
                            </p>
                            <p className="font-semibold text-foreground">
                              Seuil : {formatCurrency(accord.franco_seuil_ht)}
                            </p>
                            <p className="text-muted-foreground">
                              Frais : {formatCurrency(accord.franco_frais_port)}
                            </p>
                          </div>
                        )}

                        {/* Paliers RFA */}
                        {accord.paliers_rfa.length > 0 && (
                          <div className="p-3 bg-warning-light rounded-lg">
                            <p className="text-xs text-warning mb-1">
                              Paliers RFA ({accord.paliers_rfa.length})
                            </p>
                            {accord.paliers_rfa.map((palier) => (
                              <p key={palier.id} className="text-muted-foreground text-xs">
                                {formatCurrency(palier.seuil_min)}
                                {palier.seuil_max ? ` - ${formatCurrency(palier.seuil_max)}` : '+'}
                                {' '}= {palier.taux_rfa}%
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ));
              })}

              {/* Modal edition conditions commerciales */}
              {editingLaboId && (
                <ConditionsCommercialesForm
                  laboratoireId={editingLaboId}
                  onClose={() => setEditingLaboId(null)}
                  onSaved={() => {
                    setEditingLaboId(null);
                    loadData();
                  }}
                />
              )}

              <div className="text-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => onNavigate('fournisseurs')}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Gerer les fournisseurs
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ==================== TAB 3: PARAMETRES ==================== */}
        <TabsContent value="parametres" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                Seuils d'alerte
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="seuil-warning">
                    Seuil d'alerte (warning)
                  </Label>
                  <div className="relative">
                    <Input
                      id="seuil-warning"
                      type="number"
                      min={0}
                      step={10}
                      value={params.seuil_warning}
                      onChange={(e) =>
                        setParams((p) => ({ ...p, seuil_warning: Number(e.target.value) }))
                      }
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      EUR
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Anomalies au-dessus de ce montant sont marquees en orange
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seuil-critique">
                    Seuil critique
                  </Label>
                  <div className="relative">
                    <Input
                      id="seuil-critique"
                      type="number"
                      min={0}
                      step={10}
                      value={params.seuil_critique}
                      onChange={(e) =>
                        setParams((p) => ({ ...p, seuil_critique: Number(e.target.value) }))
                      }
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      EUR
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Anomalies au-dessus de ce montant sont marquees en rouge (prioritaires)
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="freq-rapport">Frequence du rapport</Label>
                <select
                  id="freq-rapport"
                  value={params.frequence_rapport}
                  onChange={(e) =>
                    setParams((p) => ({
                      ...p,
                      frequence_rapport: e.target.value as VerificationParams['frequence_rapport'],
                    }))
                  }
                  className="flex h-9 w-full sm:w-60 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="quotidien">Quotidien</option>
                  <option value="hebdomadaire">Hebdomadaire</option>
                  <option value="mensuel">Mensuel</option>
                  <option value="desactive">Desactive</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Frequence a laquelle un rapport de verification est genere automatiquement
                </p>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleSaveParams}
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Save className="h-4 w-4" />
                  Sauvegarder les parametres
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== TAB 4: HISTORIQUE COMMERCIAL ==================== */}
        <TabsContent value="historique" className="space-y-6 mt-4">
          {!apiMode ? (
            <Alert variant="info">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium">Disponible en mode connecte</p>
                <p className="text-sm mt-1 opacity-80">
                  Connectez un backend pour consulter l'historique des avantages commerciaux.
                </p>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* EMAC stats mini-cards */}
              {emacStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">EMAC enregistres</p>
                    <p className="text-2xl font-bold text-foreground">{emacStats.total_emacs}</p>
                  </div>
                  <div className="p-3 bg-warning-light rounded-lg text-center">
                    <p className="text-xs text-warning">En attente</p>
                    <p className="text-2xl font-bold text-warning">
                      {emacStats.emacs_non_verifies}
                      {emacStats.nb_emacs_manquants > 0 && (
                        <span className="text-sm ml-1">
                          (+{emacStats.nb_emacs_manquants} manquants)
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="p-3 bg-info-light rounded-lg text-center">
                    <p className="text-xs text-info">Solde a percevoir</p>
                    <p className="text-2xl font-bold text-info">
                      {formatCurrency(emacStats.total_solde_a_percevoir)}
                    </p>
                  </div>
                  <div className="p-3 bg-success-light rounded-lg text-center">
                    <p className="text-xs text-success">
                      Montant recouvrable
                    </p>
                    <p className="text-2xl font-bold text-success">
                      {formatCurrency(emacStats.total_montant_recouvrable)}
                    </p>
                  </div>
                </div>
              )}

              {emacStats && emacStats.emacs_ecart > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {emacStats.emacs_ecart} EMAC avec ecarts detectes
                  </AlertDescription>
                </Alert>
              )}

              {/* Derniers EMAC */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    Derniers EMAC
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate('emac')}
                    className="gap-2"
                  >
                    Voir tout
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <DataTable
                  data={emacList}
                  columns={emacColumns}
                  rowKey={(row) => row.id}
                  loading={loading}
                  loadingRows={3}
                  emptyMessage="Aucun EMAC enregistre"
                  emptyDescription="Importez ou saisissez vos EMAC pour commencer le suivi"
                  emptyIcon={<ClipboardList className="h-8 w-8 text-muted-foreground/50" />}
                />
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
