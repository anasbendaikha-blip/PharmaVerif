/**
 * PharmaVerif - Types pour l'API backend
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 *
 * Ces types mirrorent les schémas Pydantic du backend FastAPI.
 * Séparé de src/app/types.ts (types frontend localStorage).
 */

// ========================================
// PHARMACIE (TENANT)
// ========================================

export type PlanPharmacie = 'free' | 'pro' | 'enterprise';

export interface PharmacyResponse {
  id: number;
  nom: string;
  adresse: string | null;
  siret: string | null;
  titulaire: string | null;
  plan: PlanPharmacie;
  actif: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface PharmacyCreate {
  nom: string;
  adresse?: string | null;
  siret?: string | null;
  titulaire?: string | null;
  plan?: PlanPharmacie;
}

export interface PharmacyUpdate {
  nom?: string;
  adresse?: string | null;
  siret?: string | null;
  titulaire?: string | null;
  plan?: PlanPharmacie;
}

export interface PharmacyStats {
  pharmacy_id: number;
  nb_users: number;
  nb_grossistes: number;
  nb_laboratoires: number;
  nb_factures_labo: number;
  nb_emacs: number;
}

// ========================================
// AUTHENTIFICATION
// ========================================

export interface BackendUser {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  role: 'admin' | 'pharmacien' | 'comptable' | 'lecture';
  actif: boolean;
  pharmacy_id: number | null;
  created_at: string;
  last_login: string | null;
  pharmacy?: PharmacyResponse | null;
}

export interface BackendToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: BackendUser;
  token: BackendToken;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nom: string;
  prenom: string;
  role?: string;
  actif?: boolean;
  pharmacy_id?: number;
}

export interface RegisterWithPharmacyRequest {
  email: string;
  password: string;
  nom: string;
  prenom: string;
  pharmacy_nom: string;
  pharmacy_adresse?: string | null;
  pharmacy_siret?: string | null;
  pharmacy_titulaire?: string | null;
}

export interface RegisterWithPharmacyResponse {
  user: BackendUser;
  pharmacy: PharmacyResponse;
  token: BackendToken;
  message: string;
}

// ========================================
// LABORATOIRES
// ========================================

export interface LaboratoireResponse {
  id: number;
  nom: string;
  type: string;
  actif: boolean;
  created_at: string;
}

// ========================================
// FACTURES LABORATOIRES
// ========================================

export interface LigneFactureLaboResponse {
  id: number;
  facture_id: number;
  cip13: string;
  designation: string;
  numero_lot: string | null;
  quantite: number;
  prix_unitaire_ht: number;
  remise_pct: number;
  prix_unitaire_apres_remise: number;
  montant_ht: number;
  taux_tva: number;
  montant_brut: number;
  montant_remise: number;
  categorie: string | null;
  tranche: string | null;
  created_at: string;
}

export interface FactureLaboResponse {
  id: number;
  user_id: number;
  laboratoire_id: number;
  numero_facture: string;
  date_facture: string;
  date_commande: string | null;
  date_livraison: string | null;
  numero_client: string | null;
  nom_client: string | null;
  montant_brut_ht: number;
  total_remise_facture: number;
  montant_net_ht: number;
  montant_ttc: number | null;
  tranche_a_brut: number;
  tranche_a_remise: number;
  tranche_a_pct_reel: number;
  tranche_b_brut: number;
  tranche_b_remise: number;
  tranche_b_pct_reel: number;
  otc_brut: number;
  otc_remise: number;
  rfa_attendue: number;
  rfa_recue: number | null;
  ecart_rfa: number | null;
  nb_lignes: number;
  nb_pages: number;
  statut: 'non_verifie' | 'analysee' | 'conforme' | 'ecart_rfa' | 'verifiee';
  created_at: string;
  warnings: string[] | null;
  laboratoire?: LaboratoireResponse | null;
  lignes: LigneFactureLaboResponse[];
  anomalies_labo: AnomalieFactureLaboResponse[];
}

export interface FactureLaboListResponse {
  factures: FactureLaboResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ========================================
// ANALYSE TRANCHES / REMISES
// ========================================

export interface AnalyseTrancheResponse {
  tranche: string;
  montant_brut: number;
  montant_remise: number;
  taux_remise_reel: number;
  taux_remise_cible: number;
  ecart_taux: number;
  rfa_attendue: number;
  nb_lignes: number;
  pct_ca: number;
}

export interface AnalyseRemiseResponse {
  tranches: AnalyseTrancheResponse[];
  rfa_totale_attendue: number;
  rfa_recue: number | null;
  ecart_rfa: number | null;
  montant_brut_total: number;
  montant_remise_total: number;
  taux_remise_global: number;
}

// ========================================
// FOURNISSEUR DÉTECTÉ
// ========================================

export interface FournisseurDetecte {
  nom: string;
  type: string;
  detecte_auto: boolean;
  parser_id: string;
  confiance: number;
}

// ========================================
// UPLOAD
// ========================================

export interface UploadLaboResponse {
  success: boolean;
  message: string;
  facture: FactureLaboResponse | null;
  analyse: AnalyseRemiseResponse | null;
  fournisseur: FournisseurDetecte | null;
  verification: VerificationLaboResponse | null;
  warnings: string[] | null;
}

// ========================================
// ANOMALIES FACTURE LABO
// ========================================

export type SeveriteAnomalie = 'critical' | 'opportunity' | 'info';

export type TypeAnomalieLabo =
  | 'remise_ecart'
  | 'escompte_manquant'
  | 'franco_seuil'
  | 'rfa_palier'
  | 'gratuite_manquante'
  | 'tva_incoherence'
  | 'calcul_arithmetique';

export interface AnomalieFactureLaboResponse {
  id: number;
  facture_id: number;
  type_anomalie: TypeAnomalieLabo;
  severite: SeveriteAnomalie;
  description: string;
  montant_ecart: number;
  action_suggeree: string | null;
  ligne_id: number | null;
  resolu: boolean;
  resolu_at: string | null;
  note_resolution: string | null;
  created_at: string;
}

// ========================================
// VERIFICATION
// ========================================

export interface VerificationLaboResponse {
  facture_id: number;
  nb_anomalies: number;
  nb_critical: number;
  nb_opportunity: number;
  nb_info: number;
  montant_total_ecart: number;
  anomalies: AnomalieFactureLaboResponse[];
  statut: string;
  message: string;
}

// ========================================
// PALIERS RFA
// ========================================

export interface PalierRFAResponse {
  id: number;
  accord_id: number;
  seuil_min: number;
  seuil_max: number | null;
  taux_rfa: number;
  description: string | null;
  created_at: string;
}

export interface RFAProgressionResponse {
  laboratoire_id: number;
  laboratoire_nom: string;
  annee: number;
  cumul_achats_ht: number;
  palier_actuel: PalierRFAResponse | null;
  palier_suivant: PalierRFAResponse | null;
  montant_restant_prochain_palier: number | null;
  taux_rfa_actuel: number;
  rfa_estimee_annuelle: number;
  progression_pct: number;
}

// ========================================
// RFA
// ========================================

export interface RFAUpdateResponse {
  facture_id: number;
  rfa_attendue: number;
  rfa_recue: number;
  ecart_rfa: number;
  statut: string;
  message: string;
}

// ========================================
// ACCORDS COMMERCIAUX
// ========================================

export interface AccordCommercialResponse {
  id: number;
  laboratoire_id: number;
  nom: string;
  date_debut: string;
  date_fin: string | null;

  // Tranche A
  tranche_a_pct_ca: number;
  tranche_a_cible: number;

  // Tranche B
  tranche_b_pct_ca: number;
  tranche_b_cible: number;

  // OTC
  otc_cible: number;

  // Bonus disponibilite
  bonus_dispo_max_pct: number;
  bonus_seuil_pct: number;

  // Escompte
  escompte_pct: number;
  escompte_delai_jours: number;
  escompte_applicable: boolean;

  // Franco de port
  franco_seuil_ht: number;
  franco_frais_port: number;

  // Gratuites
  gratuites_seuil_qte: number;
  gratuites_ratio: string;
  gratuites_applicable: boolean;

  actif: boolean;
  created_at: string;
  paliers_rfa: PalierRFAResponse[];
}

export interface AccordCommercialCreate {
  nom: string;
  date_debut: string;
  date_fin?: string | null;
  tranche_a_pct_ca?: number;
  tranche_a_cible?: number;
  tranche_b_pct_ca?: number;
  tranche_b_cible?: number;
  otc_cible?: number;
  bonus_dispo_max_pct?: number;
  bonus_seuil_pct?: number;
  escompte_pct?: number;
  escompte_delai_jours?: number;
  escompte_applicable?: boolean;
  franco_seuil_ht?: number;
  franco_frais_port?: number;
  gratuites_seuil_qte?: number;
  gratuites_ratio?: string;
  gratuites_applicable?: boolean;
  actif?: boolean;
}

export interface PalierRFACreate {
  seuil_min: number;
  seuil_max?: number | null;
  taux_rfa: number;
  description?: string | null;
}

export interface LaboratoireCreate {
  nom: string;
  type?: string;
  actif?: boolean;
}

// ========================================
// EMAC (Etat Mensuel des Avantages Commerciaux)
// ========================================

export type StatutVerificationEMAC =
  | 'non_verifie'
  | 'en_cours'
  | 'conforme'
  | 'ecart_detecte'
  | 'anomalie';

export type TypeAnomalieEMAC =
  | 'ecart_ca'
  | 'ecart_rfa'
  | 'ecart_cop'
  | 'emac_manquant'
  | 'montant_non_verse'
  | 'condition_non_appliquee'
  | 'calcul_incoherent';

export type SeveriteAnomalieEMAC = 'critical' | 'warning' | 'info';

export interface AnomalieEMACResponse {
  id: number;
  emac_id: number;
  type_anomalie: TypeAnomalieEMAC;
  severite: SeveriteAnomalieEMAC;
  description: string;
  montant_ecart: number;
  valeur_declaree: number | null;
  valeur_calculee: number | null;
  action_suggeree: string | null;
  resolu: boolean;
  resolu_at: string | null;
  note_resolution: string | null;
  created_at: string;
}

export interface EMACResponse {
  id: number;
  user_id: number;
  laboratoire_id: number;
  reference: string | null;
  periode_debut: string;
  periode_fin: string;
  type_periode: string;
  fichier_original: string | null;
  format_source: string;

  // Montants declares
  ca_declare: number;
  rfa_declaree: number;
  cop_declaree: number;
  remises_differees_declarees: number;
  autres_avantages: number;
  total_avantages_declares: number;

  // Paiement
  montant_deja_verse: number;
  solde_a_percevoir: number;
  mode_reglement: string | null;

  // Detail
  detail_avantages: unknown | null;

  // Verification
  statut_verification: StatutVerificationEMAC;
  ca_reel_calcule: number | null;
  ecart_ca: number | null;
  ecart_ca_pct: number | null;
  rfa_attendue_calculee: number | null;
  ecart_rfa: number | null;
  cop_attendue_calculee: number | null;
  ecart_cop: number | null;
  total_avantages_calcule: number | null;
  ecart_total_avantages: number | null;
  montant_recouvrable: number;
  nb_factures_matched: number;
  nb_anomalies: number;
  anomalies_resume: unknown | null;

  // Notes
  notes: string | null;

  // Timestamps
  created_at: string;
  updated_at: string | null;
  verified_at: string | null;

  // Relations
  laboratoire?: LaboratoireResponse | null;
  anomalies_emac: AnomalieEMACResponse[];
}

export interface EMACListResponse {
  emacs: EMACResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface EMACCreateManuel {
  laboratoire_id: number;
  reference?: string | null;
  periode_debut: string;
  periode_fin: string;
  type_periode?: string;
  ca_declare?: number;
  rfa_declaree?: number;
  cop_declaree?: number;
  remises_differees_declarees?: number;
  autres_avantages?: number;
  total_avantages_declares?: number;
  montant_deja_verse?: number;
  solde_a_percevoir?: number;
  mode_reglement?: string | null;
  notes?: string | null;
}

export interface EMACUpdate {
  reference?: string | null;
  periode_debut?: string;
  periode_fin?: string;
  type_periode?: string;
  ca_declare?: number;
  rfa_declaree?: number;
  cop_declaree?: number;
  remises_differees_declarees?: number;
  autres_avantages?: number;
  total_avantages_declares?: number;
  montant_deja_verse?: number;
  solde_a_percevoir?: number;
  mode_reglement?: string | null;
  notes?: string | null;
}

export interface TriangleVerificationItem {
  label: string;
  valeur_emac: number;
  valeur_factures: number | null;
  valeur_conditions: number | null;
  ecart_emac_factures: number | null;
  ecart_emac_conditions: number | null;
  ecart_pct: number | null;
  conforme: boolean;
}

export interface TriangleVerificationResponse {
  emac_id: number;
  laboratoire_id: number;
  laboratoire_nom: string;
  periode: string;
  lignes: TriangleVerificationItem[];
  nb_conformes: number;
  nb_ecarts: number;
  nb_anomalies: number;
  montant_total_ecart: number;
  montant_recouvrable: number;
  anomalies: AnomalieEMACResponse[];
  statut: StatutVerificationEMAC;
  message: string;
}

export interface EMACManquantResponse {
  laboratoire_id: number;
  laboratoire_nom: string;
  periode_debut: string;
  periode_fin: string;
  type_periode: string;
  nb_factures_periode: number;
  ca_periode: number;
  message: string;
}

export interface EMACManquantsListResponse {
  manquants: EMACManquantResponse[];
  total: number;
}

export interface UploadEMACResponse {
  success: boolean;
  message: string;
  emac: EMACResponse | null;
  verification: TriangleVerificationResponse | null;
  warnings: string[] | null;
}

export interface EMACDashboardStats {
  total_emacs: number;
  emacs_non_verifies: number;
  emacs_conformes: number;
  emacs_ecart: number;
  total_avantages_declares: number;
  total_montant_recouvrable: number;
  total_solde_a_percevoir: number;
  nb_emacs_manquants: number;
}

// ========================================
// HISTORIQUE PRIX
// ========================================

export interface HistoriquePrixResponse {
  id: number;
  cip13: string;
  designation: string;
  laboratoire_id: number;
  date_facture: string;
  facture_labo_id: number | null;
  prix_unitaire_brut: number;
  remise_pct: number;
  prix_unitaire_net: number;
  quantite: number;
  cout_net_reel: number | null;
  tranche: string | null;
  taux_tva: number | null;
  created_at: string;
  laboratoire_nom: string | null;
}

export interface HistoriquePrixListResponse {
  cip13: string;
  designation: string;
  nb_enregistrements: number;
  prix_min: number;
  prix_max: number;
  prix_moyen: number;
  derniere_date: string | null;
  historique: HistoriquePrixResponse[];
}

export interface ComparaisonFournisseurItem {
  laboratoire_id: number;
  laboratoire_nom: string;
  dernier_prix_brut: number;
  dernier_prix_net: number;
  cout_net_reel: number | null;
  remise_pct: number;
  derniere_date: string | null;
  nb_achats: number;
  quantite_totale: number;
  montant_total_ht: number;
  evolution_pct: number | null;
}

export interface ComparaisonProduitResponse {
  cip13: string;
  designation: string;
  nb_fournisseurs: number;
  meilleur_prix_net: number | null;
  meilleur_fournisseur: string | null;
  ecart_max_pct: number | null;
  fournisseurs: ComparaisonFournisseurItem[];
}

export interface TopProduitItem {
  cip13: string;
  designation: string;
  quantite_totale: number;
  montant_total_ht: number;
  nb_achats: number;
  prix_moyen_net: number;
  nb_fournisseurs: number;
  derniere_date: string | null;
}

export interface TopProduitsResponse {
  critere: string;
  periode: string | null;
  produits: TopProduitItem[];
  total: number;
}

export interface AlertePrixItem {
  type_alerte: 'hausse_prix' | 'concurrent_moins_cher' | 'condition_expire';
  severite: 'critical' | 'warning' | 'info';
  cip13: string;
  designation: string;
  laboratoire_id: number;
  laboratoire_nom: string;
  description: string;
  prix_ancien: number | null;
  prix_nouveau: number | null;
  ecart_pct: number | null;
  date_detection: string;
  meilleur_prix_concurrent: number | null;
  concurrent_nom: string | null;
  economie_potentielle: number | null;
}

export interface AlertesPrixResponse {
  nb_alertes: number;
  nb_critical: number;
  nb_warning: number;
  nb_info: number;
  alertes: AlertePrixItem[];
}

export interface EconomiePotentielleItem {
  cip13: string;
  designation: string;
  fournisseur_actuel: string;
  prix_actuel_net: number;
  meilleur_fournisseur: string;
  meilleur_prix_net: number;
  ecart_unitaire: number;
  ecart_pct: number;
  quantite_annuelle: number;
  economie_annuelle: number;
}

export interface EconomiesPotentiellesResponse {
  nb_produits_optimisables: number;
  economie_totale_annuelle: number;
  economies: EconomiePotentielleItem[];
}

export interface RechercheProduitItem {
  cip13: string;
  designation: string;
  nb_achats: number;
  derniere_date: string | null;
  prix_moyen: number;
  nb_fournisseurs: number;
}

export interface RechercheProduitResponse {
  query: string;
  nb_resultats: number;
  produits: RechercheProduitItem[];
}

// ========================================
// GÉNÉRIQUES
// ========================================

export interface MessageResponse {
  message: string;
  success: boolean;
}

export interface RecalculResponse {
  laboratoire_id: number;
  laboratoire_nom: string;
  accord_nom: string | null;
  total: number;
  succes: number;
  erreurs: number;
  message: string;
}
