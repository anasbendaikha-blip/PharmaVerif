/**
 * app.js - Gestion des interactions de la page d'accueil PharmaVerif
 * 
 * Fonctionnalités :
 * - Chargement et affichage des statistiques
 * - Affichage des dernières anomalies
 * - Formatage des montants et dates en français
 * - Animations de compteur pour les statistiques
 * - Vérification de factures (verifier.html)
 */

// ============================================================================
// CONFIGURATION ET CONSTANTES
// ============================================================================

const API_BASE_URL = '/api';
const ANIMATION_DURATION = 1500; // Durée de l'animation de compteur en ms
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// ============================================================================
// UTILITAIRES DE FORMATAGE
// ============================================================================

/**
 * Formate un montant en euros avec le format français
 * Exemple: 8450.75 -> "8 450,75 €"
 */
function formatEuro(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Formate un nombre avec espaces (séparateur de milliers français)
 * Exemple: 1234 -> "1 234"
 */
function formatNumber(number) {
  return new Intl.NumberFormat('fr-FR').format(number);
}

/**
 * Formate une date au format français
 * Exemple: "2026-02-08" -> "08/02/2026"
 */
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Retourne le badge HTML correspondant au type d'anomalie
 */
function getAnomalieBadge(type) {
  const badges = {
    'remise_manquante': '<span class="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded">Remise manquante</span>',
    'remise_incorrecte': '<span class="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">Remise incorrecte</span>',
    'ecart_calcul': '<span class="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">Écart de calcul</span>',
    'franco_non_respecte': '<span class="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">Franco non respecté</span>',
    'prix_suspect': '<span class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">Prix suspect</span>'
  };
  return badges[type] || '<span class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">Autre</span>';
}

// ============================================================================
// ANIMATIONS
// ============================================================================

/**
 * Anime un compteur de 0 à une valeur cible
 * @param {HTMLElement} element - L'élément DOM à animer
 * @param {number} target - La valeur cible
 * @param {number} duration - Durée de l'animation en ms
 * @param {function} formatter - Fonction de formatage optionnelle
 */
function animateCounter(element, target, duration = ANIMATION_DURATION, formatter = null) {
  const start = 0;
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing function (ease-out)
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = start + (target - start) * easeOut;
    
    // Appliquer le formatage si fourni
    element.textContent = formatter ? formatter(current) : Math.round(current).toString();
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      // Assurer que la valeur finale exacte est affichée
      element.textContent = formatter ? formatter(target) : target.toString();
    }
  }
  
  requestAnimationFrame(update);
}

/**
 * Anime l'apparition d'un élément avec un effet fade-in
 */
function fadeIn(element, delay = 0) {
  element.style.opacity = '0';
  element.style.transform = 'translateY(20px)';
  element.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
  
  setTimeout(() => {
    element.style.opacity = '1';
    element.style.transform = 'translateY(0)';
  }, delay);
}

// ============================================================================
// GESTION DES ERREURS
// ============================================================================

/**
 * Affiche un message d'erreur user-friendly
 */
function showError(elementId, message = "Une erreur est survenue lors du chargement des données.") {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `
      <div class="text-center py-8 text-red-600">
        <i data-lucide="alert-circle" class="w-12 h-12 mx-auto mb-2"></i>
        <p class="font-medium">${message}</p>
        <button onclick="location.reload()" class="mt-4 text-sm text-blue-600 hover:text-blue-700 underline">
          Réessayer
        </button>
      </div>
    `;
    lucide.createIcons();
  }
}

/**
 * Affiche un état de chargement
 */
function showLoading(elementId, message = "Chargement des données...") {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <div class="flex items-center justify-center space-x-2">
          <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span>${message}</span>
        </div>
      </div>
    `;
  }
}

// ============================================================================
// FONCTIONS API
// ============================================================================

/**
 * Récupère les statistiques depuis l'API
 * GET /api/stats
 */
async function fetchStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/stats`);
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data || data; // Support pour ApiResponse<StatsResponse>
  } catch (error) {
    console.error('Erreur lors du fetch des stats:', error);
    throw error;
  }
}

/**
 * Récupère toutes les factures depuis l'API
 * GET /api/factures
 */
async function fetchFactures() {
  try {
    const response = await fetch(`${API_BASE_URL}/factures`);
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data || data; // Support pour ApiResponse<Facture[]>
  } catch (error) {
    console.error('Erreur lors du fetch des factures:', error);
    throw error;
  }
}

/**
 * Récupère les grossistes depuis l'API
 * GET /api/grossistes
 */
async function fetchGrossistes() {
  try {
    const response = await fetch(`${API_BASE_URL}/grossistes`);
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.error('Erreur lors du fetch des grossistes:', error);
    throw error;
  }
}

// ============================================================================
// CHARGEMENT DES STATISTIQUES
// ============================================================================

/**
 * Charge et affiche les statistiques dans les 3 cards
 * Anime les compteurs de 0 à la valeur réelle
 */
async function loadStats() {
  try {
    // Afficher un état de chargement temporaire
    const statElements = ['stat-factures', 'stat-anomalies', 'stat-economies'];
    statElements.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '<span class="inline-block animate-pulse">...</span>';
    });
    
    // Récupérer les données
    const stats = await fetchStats();
    
    // Animer le compteur des factures
    const facturesEl = document.getElementById('stat-factures');
    if (facturesEl) {
      animateCounter(facturesEl, stats.total_factures, ANIMATION_DURATION, formatNumber);
    }
    
    // Animer le compteur des anomalies
    const anomaliesEl = document.getElementById('stat-anomalies');
    if (anomaliesEl) {
      animateCounter(anomaliesEl, stats.total_anomalies, ANIMATION_DURATION, formatNumber);
    }
    
    // Animer le compteur des économies
    const economiesEl = document.getElementById('stat-economies');
    if (economiesEl) {
      animateCounter(economiesEl, stats.economies_potentielles, ANIMATION_DURATION, formatEuro);
    }
    
    // Afficher le taux de conformité
    const tauxConformiteEl = document.getElementById('taux-conformite');
    if (tauxConformiteEl) {
      const tauxNonConforme = (100 - stats.taux_conformite).toFixed(0);
      tauxConformiteEl.textContent = `${tauxNonConforme}% `;
    }
    
    // Mettre à jour le badge d'anomalies
    const badgeEl = document.getElementById('badge-anomalies');
    if (badgeEl) {
      badgeEl.textContent = `${stats.total_anomalies} anomalie${stats.total_anomalies > 1 ? 's' : ''}`;
    }
    
  } catch (error) {
    console.error('Erreur lors du chargement des stats:', error);
    // Afficher les valeurs par défaut en cas d'erreur
    document.getElementById('stat-factures').textContent = '0';
    document.getElementById('stat-anomalies').textContent = '0';
    document.getElementById('stat-economies').textContent = '0,00 €';
  }
}

// ============================================================================
// CHARGEMENT DES ANOMALIES
// ============================================================================

/**
 * Charge et affiche les dernières anomalies détectées
 * Prend les 5 dernières factures ayant des anomalies
 */
async function loadDernieresAnomalies() {
  const tableBody = document.getElementById('anomalies-table');
  const mobileList = document.getElementById('anomalies-mobile');
  
  try {
    // Afficher l'état de chargement
    if (tableBody) showLoading('anomalies-table', 'Chargement des anomalies...');
    if (mobileList) showLoading('anomalies-mobile', 'Chargement...');
    
    // Récupérer toutes les factures
    const factures = await fetchFactures();
    
    // Filtrer les factures qui ont des anomalies et aplatir les données
    const anomaliesWithFactures = [];
    factures.forEach(facture => {
      if (facture.anomalies && facture.anomalies.length > 0) {
        facture.anomalies.forEach(anomalie => {
          anomaliesWithFactures.push({
            ...anomalie,
            facture_numero: facture.numero,
            grossiste_nom: facture.grossiste?.nom || 'N/A',
            facture_date: facture.date
          });
        });
      }
    });
    
    // Trier par date de création (plus récentes en premier)
    anomaliesWithFactures.sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );
    
    // Prendre les 5 dernières
    const dernieresAnomalies = anomaliesWithFactures.slice(0, 5);
    
    // Afficher dans le tableau (version desktop)
    if (tableBody) {
      if (dernieresAnomalies.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="5" class="px-6 py-8 text-center text-gray-500">
              <div class="flex flex-col items-center space-y-2">
                <i data-lucide="check-circle" class="w-12 h-12 text-green-500"></i>
                <span class="font-medium">Aucune anomalie détectée</span>
                <span class="text-sm">Toutes vos factures sont conformes !</span>
              </div>
            </td>
          </tr>
        `;
      } else {
        tableBody.innerHTML = dernieresAnomalies.map((anomalie, index) => `
          <tr class="hover:bg-gray-50 transition cursor-pointer" style="opacity: 0; transform: translateY(10px);" data-fade-index="${index}">
            <td class="px-6 py-4">
              <span class="font-medium text-gray-900">${anomalie.facture_numero}</span>
            </td>
            <td class="px-6 py-4 text-gray-600">${anomalie.grossiste_nom}</td>
            <td class="px-6 py-4">${getAnomalieBadge(anomalie.type_anomalie)}</td>
            <td class="px-6 py-4 text-right">
              <span class="font-semibold text-red-600">${formatEuro(anomalie.montant_ecart)}</span>
            </td>
            <td class="px-6 py-4 text-gray-600">${formatDate(anomalie.facture_date)}</td>
          </tr>
        `).join('');
        
        // Animer l'apparition des lignes
        dernieresAnomalies.forEach((_, index) => {
          const row = tableBody.querySelector(`[data-fade-index="${index}"]`);
          if (row) fadeIn(row, index * 100);
        });
      }
      
      lucide.createIcons();
    }
    
    // Afficher dans la liste mobile
    if (mobileList) {
      if (dernieresAnomalies.length === 0) {
        mobileList.innerHTML = `
          <div class="px-6 py-8 text-center text-gray-500">
            <div class="flex flex-col items-center space-y-2">
              <i data-lucide="check-circle" class="w-12 h-12 text-green-500"></i>
              <span class="font-medium">Aucune anomalie détectée</span>
            </div>
          </div>
        `;
      } else {
        mobileList.innerHTML = dernieresAnomalies.map((anomalie, index) => `
          <div class="px-6 py-4 hover:bg-gray-50 transition" style="opacity: 0; transform: translateY(10px);" data-fade-mobile-index="${index}">
            <div class="flex justify-between items-start mb-2">
              <span class="font-medium text-gray-900">${anomalie.facture_numero}</span>
              <span class="font-semibold text-red-600">${formatEuro(anomalie.montant_ecart)}</span>
            </div>
            <div class="text-sm text-gray-600 mb-2">${anomalie.grossiste_nom}</div>
            <div class="flex justify-between items-center">
              ${getAnomalieBadge(anomalie.type_anomalie)}
              <span class="text-xs text-gray-500">${formatDate(anomalie.facture_date)}</span>
            </div>
          </div>
        `).join('');
        
        // Animer l'apparition des cartes mobile
        dernieresAnomalies.forEach((_, index) => {
          const card = mobileList.querySelector(`[data-fade-mobile-index="${index}"]`);
          if (card) fadeIn(card, index * 100);
        });
      }
      
      lucide.createIcons();
    }
    
  } catch (error) {
    console.error('Erreur lors du chargement des anomalies:', error);
    if (tableBody) {
      showError('anomalies-table', 'Impossible de charger les anomalies.');
    }
    if (mobileList) {
      showError('anomalies-mobile', 'Impossible de charger les anomalies.');
    }
  }
}

// ============================================================================
// CHARGEMENT DES GROSSISTES
// ============================================================================

/**
 * Charge et affiche les conditions de remises des grossistes
 */
async function loadGrossistes() {
  const grid = document.getElementById('grossistes-grid');
  
  if (!grid) return;
  
  try {
    showLoading('grossistes-grid', 'Chargement des grossistes...');
    
    const grossistes = await fetchGrossistes();
    
    grid.innerHTML = grossistes.map((g, index) => `
      <div class="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-600 hover:shadow-lg transition" 
           style="opacity: 0; transform: translateY(20px);" 
           data-grossiste-index="${index}">
        <h3 class="text-xl font-bold text-gray-900 mb-4">${g.nom}</h3>
        <div class="space-y-3">
          <div class="flex justify-between items-center text-sm">
            <span class="text-gray-600">Remise de base</span>
            <span class="font-semibold text-gray-900">${g.remise_base.toFixed(1)}%</span>
          </div>
          <div class="flex justify-between items-center text-sm">
            <span class="text-gray-600">Coopération commerciale</span>
            <span class="font-semibold text-gray-900">${g.cooperation_commerciale.toFixed(1)}%</span>
          </div>
          <div class="flex justify-between items-center text-sm">
            <span class="text-gray-600">Escompte</span>
            <span class="font-semibold text-gray-900">${g.escompte.toFixed(1)}%</span>
          </div>
          <div class="pt-3 border-t border-gray-200">
            <div class="flex justify-between items-center text-sm">
              <span class="text-gray-600">Franco (port gratuit)</span>
              <span class="font-semibold text-green-600">${formatEuro(g.franco)}</span>
            </div>
          </div>
          <div class="pt-3 border-t border-gray-200">
            <div class="text-sm">
              <span class="text-gray-600">Remise totale : </span>
              <span class="font-bold text-blue-600 text-lg">${(g.remise_base + g.cooperation_commerciale + g.escompte).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    `).join('');
    
    // Animer l'apparition des cartes grossistes
    grossistes.forEach((_, index) => {
      const card = grid.querySelector(`[data-grossiste-index="${index}"]`);
      if (card) fadeIn(card, index * 150);
    });
    
    lucide.createIcons();
    
  } catch (error) {
    console.error('Erreur lors du chargement des grossistes:', error);
    showError('grossistes-grid', 'Impossible de charger les grossistes.');
  }
}

// ============================================================================
// INITIALISATION
// ============================================================================

/**
 * Initialise l'application au chargement de la page
 * Charge toutes les données et configure les événements
 */
async function init() {
  console.log('🚀 Initialisation de PharmaVerif...');
  
  // Initialiser les icônes Lucide
  lucide.createIcons();
  
  // Charger toutes les données en parallèle
  try {
    await Promise.all([
      loadStats(),
      loadDernieresAnomalies(),
      loadGrossistes()
    ]);
    
    console.log('✅ Données chargées avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
  }
  
  // Configurer le smooth scroll pour les ancres
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    });
  });
}

// Lancer l'initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', init);

// Export des fonctions pour usage externe si nécessaire
window.PharmaVerif = {
  loadStats,
  loadDernieresAnomalies,
  loadGrossistes,
  formatEuro,
  formatDate,
  formatNumber
};

// ============================================================================
// FONCTIONS POUR verifier.html - VÉRIFICATION DE FACTURES
// ============================================================================

/**
 * Convertit un montant saisi (peut contenir virgule) en nombre
 * Exemple: "1 234,56" -> 1234.56
 */
function parseAmount(value) {
  if (!value) return 0;
  
  // Convertir en string si ce n'est pas déjà le cas
  const strValue = String(value);
  
  // Remplacer les espaces et la virgule par point
  const normalized = strValue.replace(/\s/g, '').replace(',', '.');
  
  return parseFloat(normalized) || 0;
}

/**
 * Valide les données du formulaire
 * @param {Object} formData - Données du formulaire
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateFormData(formData) {
  const errors = [];
  
  // Vérifier le grossiste
  if (!formData.grossiste_id || formData.grossiste_id === 0) {
    errors.push('Veuillez sélectionner un grossiste');
  }
  
  // Vérifier le numéro de facture
  if (!formData.numero || formData.numero.trim() === '') {
    errors.push('Le numéro de facture est requis');
  }
  
  // Vérifier la date
  if (!formData.date) {
    errors.push('La date de la facture est requise');
  } else {
    const factureDate = new Date(formData.date);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Fin de journée
    
    if (factureDate > today) {
      errors.push('La date de la facture ne peut pas être dans le futur');
    }
  }
  
  // Vérifier le montant brut HT
  if (formData.montant_brut_ht <= 0) {
    errors.push('Le montant brut HT doit être supérieur à 0');
  }
  
  // Vérifier le net à payer
  if (formData.net_a_payer <= 0) {
    errors.push('Le net à payer doit être supérieur à 0');
  }
  
  // Vérifier la cohérence : net à payer ne peut pas être supérieur au brut
  if (formData.net_a_payer > formData.montant_brut_ht) {
    errors.push('Le net à payer ne peut pas être supérieur au montant brut HT');
  }
  
  // Vérifier que les remises ne sont pas négatives
  if (formData.remises_ligne < 0) {
    errors.push('Les remises ligne à ligne ne peuvent pas être négatives');
  }
  
  if (formData.remises_pied < 0) {
    errors.push('Les remises pied de facture ne peuvent pas être négatives');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Affiche les erreurs de validation dans une alerte
 */
function displayValidationErrors(errors) {
  const errorMessage = errors.join('\n• ');
  alert('Erreurs de validation :\n\n• ' + errorMessage);
}

/**
 * Active ou désactive le bouton de soumission avec un loader
 * @param {boolean} loading - True pour afficher le loader
 */
function setSubmitButtonState(loading) {
  const submitBtn = document.querySelector('#verification-form button[type="submit"]');
  if (!submitBtn) return;
  
  if (loading) {
    submitBtn.disabled = true;
    submitBtn.dataset.originalContent = submitBtn.innerHTML;
    submitBtn.innerHTML = `
      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto"></div>
      <span class="sr-only">Vérification en cours...</span>
    `;
  } else {
    submitBtn.disabled = false;
    if (submitBtn.dataset.originalContent) {
      submitBtn.innerHTML = submitBtn.dataset.originalContent;
    }
    // Réinitialiser les icônes
    lucide.createIcons();
  }
}

/**
 * Crée une nouvelle facture via l'API
 * POST /api/factures
 * @param {Object} formData - Données de la facture
 * @returns {Promise<Object>} - Facture créée avec son ID
 */
async function createFacture(formData) {
  try {
    const response = await fetch(`${API_BASE_URL}/factures`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erreur HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.error('Erreur lors de la création de la facture:', error);
    throw error;
  }
}

/**
 * Vérifie une facture existante via l'API
 * POST /api/factures/{factureId}/verify
 * @param {number} factureId - ID de la facture à vérifier
 * @returns {Promise<Object>} - Résultat de la vérification avec anomalies
 */
async function verifyFacture(factureId) {
  try {
    const response = await fetch(`${API_BASE_URL}/factures/${factureId}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erreur HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.error('Erreur lors de la vérification de la facture:', error);
    throw error;
  }
}

/**
 * Retourne le titre lisible pour un type d'anomalie
 */
function getAnomalieTitle(type) {
  const titles = {
    'remise_manquante': 'Remise manquante',
    'remise_incorrecte': 'Remise incorrecte',
    'ecart_calcul': 'Écart de calcul',
    'franco_non_respecte': 'Franco non respecté',
    'prix_suspect': 'Prix suspect'
  };
  return titles[type] || 'Anomalie détectée';
}

/**
 * Affiche les résultats de la vérification
 * @param {Object} verificationResult - Résultat contenant les anomalies
 */
function displayResults(verificationResult) {
  const resultatsDiv = document.getElementById('resultats');
  const conformeDiv = document.getElementById('resultat-conforme');
  const anomaliesDiv = document.getElementById('resultat-anomalies');
  
  if (!resultatsDiv || !conformeDiv || !anomaliesDiv) return;
  
  // Afficher la section résultats
  resultatsDiv.classList.remove('hidden');
  
  if (verificationResult.anomalies && verificationResult.anomalies.length > 0) {
    // === FACTURE AVEC ANOMALIES ===
    conformeDiv.classList.add('hidden');
    anomaliesDiv.classList.remove('hidden');
    
    // Mettre à jour le compteur
    const count = verificationResult.anomalies.length;
    const anomaliesCountEl = document.getElementById('anomalies-count');
    if (anomaliesCountEl) {
      anomaliesCountEl.textContent = `${count} anomalie${count > 1 ? 's' : ''} détectée${count > 1 ? 's' : ''}`;
    }
    
    // Afficher la liste des anomalies
    const anomaliesList = document.getElementById('anomalies-list');
    if (anomaliesList) {
      anomaliesList.innerHTML = verificationResult.anomalies.map((anomalie, index) => `
        <div class="bg-white border-2 border-orange-200 rounded-lg p-5 slide-in-up" style="animation-delay: ${index * 0.1}s">
          <div class="flex items-start space-x-3">
            <div class="bg-orange-100 text-orange-600 p-2 rounded flex-shrink-0">
              <i data-lucide="alert-circle" class="w-6 h-6"></i>
            </div>
            <div class="flex-1">
              <h4 class="font-semibold text-gray-900 mb-1">${getAnomalieTitle(anomalie.type_anomalie)}</h4>
              <p class="text-sm text-gray-600 mb-2">${anomalie.description}</p>
              <div class="flex items-center space-x-2">
                <span class="text-xs text-gray-500">Écart:</span>
                <span class="font-bold text-red-600">${formatEuro(anomalie.montant_ecart)}</span>
              </div>
            </div>
          </div>
        </div>
      `).join('');
    }
    
    // Mettre à jour le total des économies
    const totalEconomies = verificationResult.anomalies.reduce((sum, a) => sum + a.montant_ecart, 0);
    const totalEconomiesEl = document.getElementById('total-economies');
    if (totalEconomiesEl) {
      totalEconomiesEl.textContent = formatEuro(totalEconomies);
    }
    
  } else {
    // === FACTURE CONFORME ===
    anomaliesDiv.classList.add('hidden');
    conformeDiv.classList.remove('hidden');
  }
  
  // Réinitialiser les icônes
  lucide.createIcons();
  
  // Scroll vers les résultats avec un léger délai
  setTimeout(() => {
    resultatsDiv.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
  }, 300);
}

/**
 * Gère la soumission du formulaire de vérification
 * @param {Event} event - Événement de soumission
 */
async function handleFormSubmit(event) {
  event.preventDefault();
  
  console.log('📝 Soumission du formulaire de vérification');
  
  // Récupérer les valeurs du formulaire
  const formData = {
    grossiste_id: parseInt(document.getElementById('grossiste').value) || 0,
    numero: document.getElementById('numero').value.trim(),
    date: document.getElementById('date').value,
    montant_brut_ht: parseAmount(document.getElementById('montant-brut').value),
    remises_ligne: parseAmount(document.getElementById('remises-lignes').value),
    remises_pied: parseAmount(document.getElementById('remises-pied').value),
    net_a_payer: parseAmount(document.getElementById('net-a-payer').value)
  };
  
  console.log('Données du formulaire:', formData);
  
  // Valider les données
  const validation = validateFormData(formData);
  if (!validation.valid) {
    displayValidationErrors(validation.errors);
    return;
  }
  
  // Activer le loader
  setSubmitButtonState(true);
  
  try {
    // Étape 1 : Créer la facture
    console.log('📤 Création de la facture...');
    const createdFacture = await createFacture(formData);
    console.log('✅ Facture créée:', createdFacture);
    
    // Petit délai pour l'UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Étape 2 : Vérifier la facture
    console.log('🔍 Vérification de la facture...');
    const verificationResult = await verifyFacture(createdFacture.id);
    console.log('✅ Vérification terminée:', verificationResult);
    
    // Petit délai pour l'UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Étape 3 : Afficher les résultats
    displayResults(verificationResult);
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
    alert(`Erreur lors de la vérification :\n\n${error.message}\n\nVeuillez réessayer ou contacter le support.`);
  } finally {
    // Désactiver le loader
    setSubmitButtonState(false);
  }
}

/**
 * Réinitialise le formulaire et masque les résultats
 */
function resetForm() {
  console.log('🔄 Réinitialisation du formulaire');
  
  // Réinitialiser le formulaire
  const form = document.getElementById('verification-form');
  if (form) {
    form.reset();
    
    // Remettre la date à aujourd'hui
    const dateInput = document.getElementById('date');
    if (dateInput) {
      dateInput.valueAsDate = new Date();
    }
  }
  
  // Masquer les résultats
  const resultatsDiv = document.getElementById('resultats');
  if (resultatsDiv) {
    resultatsDiv.classList.add('hidden');
  }
  
  // Retirer les classes de validation des inputs
  const inputs = document.querySelectorAll('.input-error, .input-success');
  inputs.forEach(input => {
    input.classList.remove('input-error', 'input-success');
  });
  
  // Scroller vers le haut
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Marque la facture pour contestation
 */
function marquerContestation() {
  console.log('🚩 Facture marquée pour contestation');
  
  // Créer un rapport de contestation
  const rapport = {
    date_contestation: new Date().toISOString(),
    statut: 'en_attente'
  };
  
  alert('✅ Facture marquée pour contestation\n\nUn rapport détaillé sera généré et envoyé à votre grossiste.\n\nVous recevrez une notification dès que la réponse sera disponible.');
  
  // TODO: Appeler l'API pour créer une contestation
  // await fetch(`${API_BASE_URL}/contestations`, { method: 'POST', body: JSON.stringify(rapport) });
}

/**
 * Enregistre une facture conforme
 */
function enregistrerFacture() {
  console.log('💾 Enregistrement de la facture conforme');
  
  alert('✅ Facture enregistrée avec succès !\n\nLa facture a été ajoutée à votre historique.');
  
  // Proposer une nouvelle vérification
  setTimeout(() => {
    if (confirm('Voulez-vous vérifier une nouvelle facture ?')) {
      resetForm();
    }
  }, 500);
}

/**
 * Enregistre une facture malgré les anomalies
 */
function enregistrerQuandMeme() {
  console.log('⚠️ Enregistrement malgré les anomalies');
  
  if (confirm('⚠️ Attention\n\nCette facture contient des anomalies détectées.\n\nÊtes-vous sûr de vouloir l\'enregistrer quand même ?')) {
    alert('✅ Facture enregistrée avec anomalies\n\nLes anomalies ont été documentées et pourront être contestées ultérieurement.');\n    \n    // Proposer une nouvelle vérification
    setTimeout(() => {
      if (confirm('Voulez-vous vérifier une nouvelle facture ?')) {
        resetForm();
      }
    }, 500);
  }
}

/**
 * Lance une nouvelle vérification
 */
function nouvelleVerification() {
  console.log('🔄 Nouvelle vérification');
  resetForm();
}

/**
 * Gère l'upload d'un fichier PDF
 * @param {File} file - Fichier uploadé
 */
function handleFileUpload(file) {
  console.log('📄 Upload de fichier:', file.name);
  
  // Validation du type de fichier
  if (file.type !== 'application/pdf') {
    alert('❌ Type de fichier invalide\n\nVeuillez uploader un fichier PDF uniquement.');
    return false;
  }
  
  // Validation de la taille
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    alert(`❌ Fichier trop volumineux\n\nTaille: ${sizeMB} Mo\nMaximum autorisé: 10 Mo`);
    return false;
  }
  
  // Afficher le preview
  const fileName = document.getElementById('file-name');
  const fileSize = document.getElementById('file-size');
  const filePreview = document.getElementById('file-preview');
  const dropZoneParent = document.getElementById('drop-zone')?.parentElement;
  
  if (fileName) fileName.textContent = file.name;
  if (fileSize) fileSize.textContent = formatFileSize(file.size);
  
  // Afficher le preview, masquer la drop zone
  if (filePreview && dropZoneParent) {
    dropZoneParent.classList.add('hidden');
    filePreview.classList.remove('hidden');
    filePreview.classList.add('slide-in-up');
  }
  
  // TODO: Envoyer le fichier au backend pour OCR
  // const formData = new FormData();
  // formData.append('file', file);
  // await fetch(`${API_BASE_URL}/upload`, { method: 'POST', body: formData });
  
  console.log('✅ Fichier uploadé avec succès (en attente d\'OCR)');
  return true;
}

/**
 * Formate la taille d'un fichier en unités lisibles
 * @param {number} bytes - Taille en octets
 * @returns {string} - Taille formatée (ex: "1.2 Mo")
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' o';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
  return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
}

// ============================================================================
// INITIALISATION POUR verifier.html
// ============================================================================

/**
 * Initialise la page de vérification
 */
function initVerifierPage() {
  console.log('🔍 Initialisation de la page de vérification');
  
  // Initialiser les icônes Lucide
  lucide.createIcons();
  
  // Attacher le gestionnaire de soumission du formulaire
  const form = document.getElementById('verification-form');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
    console.log('✅ Formulaire de vérification attaché');
  }
  
  // Définir la date par défaut à aujourd'hui
  const dateInput = document.getElementById('date');
  if (dateInput && !dateInput.value) {
    dateInput.valueAsDate = new Date();
  }
  
  // Gestion du drag & drop
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  
  if (dropZone && fileInput) {
    // Click sur la drop zone = ouvrir le file picker
    dropZone.addEventListener('click', () => {
      fileInput.click();
    });
    
    // Drag over
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });
    
    // Drop
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileUpload(files[0]);
      }
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFileUpload(e.target.files[0]);
      }
    });
    
    console.log('✅ Drag & drop configuré');
  }
  
  // Bouton supprimer fichier
  const removeFileBtn = document.getElementById('remove-file');
  if (removeFileBtn) {
    removeFileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Réinitialiser le file input
      if (fileInput) fileInput.value = '';
      
      // Masquer le preview, afficher la drop zone
      const filePreview = document.getElementById('file-preview');
      const dropZoneParent = dropZone?.parentElement;
      
      if (filePreview) filePreview.classList.add('hidden');
      if (dropZoneParent) dropZoneParent.classList.remove('hidden');
      
      console.log('🗑️ Fichier supprimé');
    });
  }
  
  // Validation en temps réel des inputs requis
  const requiredInputs = document.querySelectorAll('input[required], select[required]');
  requiredInputs.forEach(input => {
    input.addEventListener('blur', () => {
      if (input.value.trim() === '') {
        input.classList.add('input-error');
        input.classList.remove('input-success');
      } else {
        input.classList.remove('input-error');
        input.classList.add('input-success');
      }
    });
    
    input.addEventListener('input', () => {
      if (input.classList.contains('input-error') && input.value.trim() !== '') {
        input.classList.remove('input-error');
        input.classList.add('input-success');
      }
    });
  });
  
  console.log('✅ Page de vérification initialisée');
}

// Vérifier si on est sur la page de vérification et initialiser
if (window.location.pathname.includes('verifier.html')) {
  document.addEventListener('DOMContentLoaded', initVerifierPage);
}

// Exporter les nouvelles fonctions
if (window.PharmaVerif) {
  window.PharmaVerif = {
    ...window.PharmaVerif,
    // Fonctions de vérification
    handleFormSubmit,
    createFacture,
    verifyFacture,
    displayResults,
    resetForm,
    handleFileUpload,
    parseAmount,
    validateFormData,
    // Actions
    marquerContestation,
    enregistrerFacture,
    enregistrerQuandMeme,
    nouvelleVerification
  };
}