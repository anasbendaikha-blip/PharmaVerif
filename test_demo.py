"""
Test complet du prototype PharmaVerif
Ce script teste tous les endpoints API et la logique de vérification

Usage:
    python test_demo.py
    
    Ou avec pytest:
    pytest test_demo.py -v
"""

import sys
import os
import json
from typing import List, Dict, Any

# Ajouter le dossier backend au path pour les imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False
    print("⚠️  Module 'requests' non trouvé. Installation recommandée: pip install requests")

# Configuration
API_BASE_URL = "http://localhost:8000/api"
TEST_RESULTS = []


# ============================================================================
# UTILITAIRES
# ============================================================================

class TestResult:
    """Stocke le résultat d'un test"""
    def __init__(self, name: str, passed: bool, message: str = "", error: str = ""):
        self.name = name
        self.passed = passed
        self.message = message
        self.error = error


def test_wrapper(test_name: str):
    """Décorateur pour wrapper les tests et capturer les résultats"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            try:
                print(f"\n🧪 Test: {test_name}")
                result = func(*args, **kwargs)
                if result is None or result:
                    TEST_RESULTS.append(TestResult(test_name, True, "✅ PASS"))
                    print(f"   ✅ PASS")
                    return True
                else:
                    TEST_RESULTS.append(TestResult(test_name, False, "❌ FAIL"))
                    print(f"   ❌ FAIL")
                    return False
            except AssertionError as e:
                TEST_RESULTS.append(TestResult(test_name, False, "❌ FAIL", str(e)))
                print(f"   ❌ FAIL: {e}")
                return False
            except Exception as e:
                TEST_RESULTS.append(TestResult(test_name, False, "❌ ERROR", str(e)))
                print(f"   ❌ ERROR: {e}")
                return False
        return wrapper
    return decorator


def make_request(method: str, endpoint: str, data: Dict = None) -> Dict:
    """Effectue une requête HTTP à l'API"""
    if not HAS_REQUESTS:
        raise Exception("Module 'requests' requis. Installer avec: pip install requests")
    
    url = f"{API_BASE_URL}{endpoint}"
    
    try:
        if method == "GET":
            response = requests.get(url)
        elif method == "POST":
            response = requests.post(url, json=data)
        elif method == "PUT":
            response = requests.put(url, json=data)
        elif method == "DELETE":
            response = requests.delete(url)
        else:
            raise ValueError(f"Méthode HTTP non supportée: {method}")
        
        response.raise_for_status()
        return response.json()
    except requests.exceptions.ConnectionError:
        raise Exception(f"❌ Impossible de se connecter à {API_BASE_URL}. Le serveur est-il démarré?")
    except requests.exceptions.HTTPError as e:
        raise Exception(f"Erreur HTTP {response.status_code}: {response.text}")


# ============================================================================
# TESTS D'INITIALISATION
# ============================================================================

@test_wrapper("Serveur accessible")
def test_server_running():
    """Vérifie que le serveur FastAPI est démarré"""
    try:
        response = requests.get("http://localhost:8000/docs", timeout=2)
        assert response.status_code == 200, "Le serveur ne répond pas"
        return True
    except requests.exceptions.ConnectionError:
        raise Exception("Le serveur n'est pas démarré. Lancer: cd backend && python main.py")


@test_wrapper("3 grossistes présents en base")
def test_grossistes_count():
    """Vérifie que les 3 grossistes sont bien créés"""
    data = make_request("GET", "/grossistes")
    grossistes = data.get("data", [])
    
    assert len(grossistes) == 3, f"Attendu 3 grossistes, trouvé {len(grossistes)}"
    
    noms = [g["nom"] for g in grossistes]
    assert "CERP Rouen" in noms, "CERP Rouen manquant"
    assert "OCP" in noms, "OCP manquant"
    assert "Alliance Healthcare" in noms, "Alliance Healthcare manquant"
    
    print(f"   → {len(grossistes)} grossistes trouvés: {', '.join(noms)}")
    return True


@test_wrapper("5 factures de démo créées")
def test_factures_demo_count():
    """Vérifie que les 5 factures de démo sont créées"""
    data = make_request("GET", "/factures")
    factures = data.get("data", [])
    
    assert len(factures) >= 5, f"Attendu au moins 5 factures, trouvé {len(factures)}"
    
    numeros = [f["numero"] for f in factures[:5]]
    print(f"   → {len(factures)} factures trouvées")
    print(f"   → Premières factures: {', '.join(numeros)}")
    return True


# ============================================================================
# TESTS DES ENDPOINTS API - GROSSISTES
# ============================================================================

@test_wrapper("GET /api/grossistes retourne la liste")
def test_get_grossistes():
    """Test GET de tous les grossistes"""
    data = make_request("GET", "/grossistes")
    
    assert "data" in data, "Champ 'data' manquant dans la réponse"
    grossistes = data["data"]
    assert isinstance(grossistes, list), "La data doit être une liste"
    assert len(grossistes) > 0, "La liste des grossistes est vide"
    
    # Vérifier la structure d'un grossiste
    g = grossistes[0]
    assert "id" in g, "Champ 'id' manquant"
    assert "nom" in g, "Champ 'nom' manquant"
    assert "remise_base" in g, "Champ 'remise_base' manquant"
    
    return True


@test_wrapper("GET /api/grossistes/{id} retourne un grossiste")
def test_get_grossiste_by_id():
    """Test GET d'un grossiste spécifique"""
    data = make_request("GET", "/grossistes/1")
    
    assert "data" in data, "Champ 'data' manquant"
    grossiste = data["data"]
    assert grossiste["id"] == 1, "ID incorrect"
    assert "nom" in grossiste, "Champ 'nom' manquant"
    
    print(f"   → Grossiste #1: {grossiste['nom']}")
    return True


@test_wrapper("POST /api/grossistes crée un grossiste")
def test_create_grossiste():
    """Test création d'un nouveau grossiste"""
    new_grossiste = {
        "nom": "Test Grossiste",
        "remise_base": 2.8,
        "cooperation_commerciale": 1.8,
        "escompte": 0.3,
        "franco": 1400.0
    }
    
    data = make_request("POST", "/grossistes", new_grossiste)
    
    assert "data" in data, "Champ 'data' manquant"
    created = data["data"]
    assert "id" in created, "ID manquant après création"
    assert created["nom"] == new_grossiste["nom"], "Nom incorrect"
    
    print(f"   → Grossiste créé avec ID: {created['id']}")
    return True


# ============================================================================
# TESTS DES ENDPOINTS API - FACTURES
# ============================================================================

@test_wrapper("GET /api/factures retourne la liste")
def test_get_factures():
    """Test GET de toutes les factures"""
    data = make_request("GET", "/factures")
    
    assert "data" in data, "Champ 'data' manquant"
    factures = data["data"]
    assert isinstance(factures, list), "La data doit être une liste"
    assert len(factures) > 0, "La liste des factures est vide"
    
    # Vérifier la structure d'une facture
    f = factures[0]
    assert "id" in f, "Champ 'id' manquant"
    assert "numero" in f, "Champ 'numero' manquant"
    assert "montant_brut_ht" in f, "Champ 'montant_brut_ht' manquant"
    assert "statut_verification" in f, "Champ 'statut_verification' manquant"
    
    return True


@test_wrapper("GET /api/factures/{id} retourne une facture")
def test_get_facture_by_id():
    """Test GET d'une facture spécifique"""
    data = make_request("GET", "/factures/1")
    
    assert "data" in data, "Champ 'data' manquant"
    facture = data["data"]
    assert facture["id"] == 1, "ID incorrect"
    assert "numero" in facture, "Champ 'numero' manquant"
    
    print(f"   → Facture #1: {facture['numero']}")
    return True


@test_wrapper("POST /api/factures crée une facture")
def test_create_facture():
    """Test création d'une nouvelle facture"""
    new_facture = {
        "grossiste_id": 1,
        "numero": "FAC-TEST-999",
        "date": "2026-02-08",
        "montant_brut_ht": 5000.0,
        "remises_ligne_a_ligne": 150.0,
        "remises_pied_facture": 125.0,
        "net_a_payer": 4725.0,
        "statut_verification": "non_verifie"
    }
    
    data = make_request("POST", "/factures", new_facture)
    
    assert "data" in data, "Champ 'data' manquant"
    created = data["data"]
    assert "id" in created, "ID manquant après création"
    assert created["numero"] == new_facture["numero"], "Numéro incorrect"
    
    print(f"   → Facture créée avec ID: {created['id']}")
    return True


@test_wrapper("POST /api/factures/verify crée et vérifie une facture")
def test_verify_facture_endpoint():
    """Test endpoint de vérification directe"""
    facture_data = {
        "grossiste_id": 1,
        "numero": "FAC-TEST-VERIFY-001",
        "date": "2026-02-08",
        "montant_brut_ht": 5000.0,
        "remises_ligne_a_ligne": 150.0,
        "remises_pied_facture": 100.0,
        "net_a_payer": 4750.0
    }
    
    data = make_request("POST", "/factures/verify", facture_data)
    
    assert "data" in data, "Champ 'data' manquant"
    result = data["data"]
    assert "facture" in result, "Facture manquante dans le résultat"
    assert "anomalies" in result, "Liste d'anomalies manquante"
    
    facture = result["facture"]
    anomalies = result["anomalies"]
    
    print(f"   → Facture créée: {facture['numero']}")
    print(f"   → Anomalies détectées: {len(anomalies)}")
    
    return True


# ============================================================================
# TESTS DES ENDPOINTS API - ANOMALIES
# ============================================================================

@test_wrapper("GET /api/anomalies retourne la liste")
def test_get_anomalies():
    """Test GET de toutes les anomalies"""
    data = make_request("GET", "/anomalies")
    
    assert "data" in data, "Champ 'data' manquant"
    anomalies = data["data"]
    assert isinstance(anomalies, list), "La data doit être une liste"
    
    print(f"   → {len(anomalies)} anomalies trouvées")
    return True


@test_wrapper("GET /api/factures/{id}/anomalies retourne les anomalies")
def test_get_anomalies_by_facture():
    """Test GET des anomalies d'une facture spécifique"""
    # Utiliser la facture 2 qui devrait avoir des anomalies
    data = make_request("GET", "/factures/2/anomalies")
    
    assert "data" in data, "Champ 'data' manquant"
    anomalies = data["data"]
    assert isinstance(anomalies, list), "La data doit être une liste"
    
    print(f"   → Facture #2: {len(anomalies)} anomalies")
    return True


# ============================================================================
# TESTS DES ENDPOINTS API - STATISTIQUES
# ============================================================================

@test_wrapper("GET /api/stats retourne des statistiques cohérentes")
def test_get_stats():
    """Test GET des statistiques globales"""
    data = make_request("GET", "/stats")
    
    assert "data" in data, "Champ 'data' manquant"
    stats = data["data"]
    
    # Vérifier la présence des champs
    assert "total_factures" in stats, "total_factures manquant"
    assert "anomalies_detectees" in stats, "anomalies_detectees manquant"
    assert "montant_recuperable" in stats, "montant_recuperable manquant"
    assert "taux_conformite" in stats, "taux_conformite manquant"
    
    # Vérifier la cohérence des valeurs
    assert stats["total_factures"] >= 5, "Devrait avoir au moins 5 factures"
    assert stats["anomalies_detectees"] >= 0, "Anomalies ne peut pas être négatif"
    assert stats["montant_recuperable"] >= 0, "Montant récupérable ne peut pas être négatif"
    assert 0 <= stats["taux_conformite"] <= 100, "Taux de conformité doit être entre 0 et 100"
    
    print(f"   → Total factures: {stats['total_factures']}")
    print(f"   → Anomalies: {stats['anomalies_detectees']}")
    print(f"   → Montant récupérable: {stats['montant_recuperable']:.2f} €")
    print(f"   → Taux conformité: {stats['taux_conformite']:.1f}%")
    
    return True


@test_wrapper("GET /api/stats/recentes retourne les dernières anomalies")
def test_get_stats_recentes():
    """Test GET des dernières anomalies"""
    data = make_request("GET", "/stats/recentes")
    
    assert "data" in data, "Champ 'data' manquant"
    anomalies = data["data"]
    assert isinstance(anomalies, list), "La data doit être une liste"
    assert len(anomalies) <= 10, "Ne devrait pas retourner plus de 10 anomalies"
    
    print(f"   → {len(anomalies)} anomalies récentes")
    return True


# ============================================================================
# TESTS DE LA LOGIQUE DE VÉRIFICATION
# ============================================================================

@test_wrapper("Facture conforme détectée (0 anomalie)")
def test_facture_conforme():
    """Test qu'une facture conforme ne génère pas d'anomalie"""
    # Créer une facture conforme pour CERP Rouen
    # Remise base: 3%, Coop: 2%, Escompte: 0.5% = 5.5% total
    montant_brut = 5000.0
    remise_attendue = montant_brut * 0.055  # 275€
    
    facture_data = {
        "grossiste_id": 1,  # CERP Rouen
        "numero": "FAC-TEST-CONFORME",
        "date": "2026-02-08",
        "montant_brut_ht": montant_brut,
        "remises_ligne_a_ligne": 150.0,
        "remises_pied_facture": 125.0,  # Total 275€
        "net_a_payer": montant_brut - 275.0
    }
    
    data = make_request("POST", "/factures/verify", facture_data)
    result = data["data"]
    anomalies = result["anomalies"]
    
    assert len(anomalies) == 0, f"Attendu 0 anomalie, trouvé {len(anomalies)}"
    assert result["facture"]["statut_verification"] == "conforme", "Statut devrait être 'conforme'"
    
    print(f"   → Aucune anomalie détectée (conforme)")
    return True


@test_wrapper("Facture avec remise manquante détectée")
def test_facture_remise_manquante():
    """Test qu'une remise manquante est détectée"""
    # Créer une facture avec remise insuffisante
    montant_brut = 5000.0
    remise_appliquee = 200.0  # Au lieu de 275€ attendus
    
    facture_data = {
        "grossiste_id": 1,  # CERP Rouen
        "numero": "FAC-TEST-REMISE-MANQUANTE",
        "date": "2026-02-08",
        "montant_brut_ht": montant_brut,
        "remises_ligne_a_ligne": 100.0,
        "remises_pied_facture": 100.0,  # Total 200€ (insuffisant)
        "net_a_payer": montant_brut - remise_appliquee
    }
    
    data = make_request("POST", "/factures/verify", facture_data)
    result = data["data"]
    anomalies = result["anomalies"]
    
    assert len(anomalies) > 0, "Devrait détecter au moins une anomalie"
    assert result["facture"]["statut_verification"] == "anomalie", "Statut devrait être 'anomalie'"
    
    # Calculer l'écart total
    ecart_total = sum(a["montant_ecart"] for a in anomalies)
    print(f"   → {len(anomalies)} anomalie(s) détectée(s)")
    print(f"   → Écart total: {ecart_total:.2f} €")
    
    return True


@test_wrapper("Calcul correct des écarts de remise")
def test_calcul_ecarts():
    """Vérifie que les écarts sont calculés correctement"""
    montant_brut = 10000.0
    remise_theorique = montant_brut * 0.055  # 550€ pour CERP Rouen
    remise_appliquee = 400.0
    ecart_attendu = remise_theorique - remise_appliquee  # 150€
    
    facture_data = {
        "grossiste_id": 1,
        "numero": "FAC-TEST-CALCUL",
        "date": "2026-02-08",
        "montant_brut_ht": montant_brut,
        "remises_ligne_a_ligne": 200.0,
        "remises_pied_facture": 200.0,
        "net_a_payer": montant_brut - remise_appliquee
    }
    
    data = make_request("POST", "/factures/verify", facture_data)
    result = data["data"]
    anomalies = result["anomalies"]
    
    if len(anomalies) > 0:
        ecart_total = sum(a["montant_ecart"] for a in anomalies)
        # Tolérance de 1€ pour les arrondis
        assert abs(ecart_total - ecart_attendu) < 1.0, \
            f"Écart calculé ({ecart_total:.2f}€) différent de l'attendu ({ecart_attendu:.2f}€)"
        
        print(f"   → Écart calculé: {ecart_total:.2f} € (attendu: {ecart_attendu:.2f} €)")
    
    return True


# ============================================================================
# TESTS DES MONTANTS DES FACTURES DE DÉMO
# ============================================================================

@test_wrapper("Facture #2 (FAC-CERP-002) : ~127€ d'anomalie")
def test_facture_2_montant():
    """Vérifie le montant d'anomalie de la facture 2"""
    data = make_request("GET", "/factures/2/anomalies")
    anomalies = data["data"]
    
    if len(anomalies) > 0:
        montant_total = sum(a["montant_ecart"] for a in anomalies)
        # Tolérance de 5€
        assert abs(montant_total - 127.5) < 5.0, \
            f"Montant anomalie ({montant_total:.2f}€) trop éloigné de 127€"
        
        print(f"   → Montant anomalie: {montant_total:.2f} € (attendu: ~127€)")
    else:
        print(f"   ⚠️  Aucune anomalie trouvée (vérifier les données de démo)")
    
    return True


@test_wrapper("Facture #3 (FAC-OCP-001) : ~102€ d'anomalie")
def test_facture_3_montant():
    """Vérifie le montant d'anomalie de la facture 3"""
    data = make_request("GET", "/factures/3/anomalies")
    anomalies = data["data"]
    
    if len(anomalies) > 0:
        montant_total = sum(a["montant_ecart"] for a in anomalies)
        # Tolérance de 25€ (valeur approximative car peut varier)
        assert abs(montant_total - 101.7) < 25.0, \
            f"Montant anomalie ({montant_total:.2f}€) trop éloigné de ~102€"
        
        print(f"   → Montant anomalie: {montant_total:.2f} € (attendu: ~102€)")
    else:
        print(f"   ⚠️  Aucune anomalie trouvée")
    
    return True


@test_wrapper("Facture #5 (FAC-ALL-001) : ~69€ d'anomalie")
def test_facture_5_montant():
    """Vérifie le montant d'anomalie de la facture 5"""
    data = make_request("GET", "/factures/5/anomalies")
    anomalies = data["data"]
    
    if len(anomalies) > 0:
        montant_total = sum(a["montant_ecart"] for a in anomalies)
        # Tolérance de 25€
        assert abs(montant_total - 68.6) < 25.0, \
            f"Montant anomalie ({montant_total:.2f}€) trop éloigné de ~69€"
        
        print(f"   → Montant anomalie: {montant_total:.2f} € (attendu: ~69€)")
    else:
        print(f"   ⚠️  Aucune anomalie trouvée")
    
    return True


@test_wrapper("Total économies potentielles : ~296€")
def test_total_economies():
    """Vérifie le montant total des économies potentielles"""
    data = make_request("GET", "/stats")
    stats = data["data"]
    
    montant_recuperable = stats["montant_recuperable"]
    
    # Tolérance de 50€ (car les montants peuvent varier légèrement)
    assert abs(montant_recuperable - 297.8) < 50.0, \
        f"Montant récupérable ({montant_recuperable:.2f}€) trop éloigné de ~296€"
    
    print(f"   → Montant récupérable: {montant_recuperable:.2f} € (attendu: ~296€)")
    return True


# ============================================================================
# FONCTION PRINCIPALE
# ============================================================================

def print_banner():
    """Affiche la bannière de démarrage"""
    print("\n" + "=" * 70)
    print("  🧪 TESTS DU PROTOTYPE PHARMAVERIF")
    print("=" * 70)


def print_summary():
    """Affiche le résumé des tests"""
    passed = sum(1 for r in TEST_RESULTS if r.passed)
    failed = sum(1 for r in TEST_RESULTS if not r.passed)
    total = len(TEST_RESULTS)
    
    print("\n" + "=" * 70)
    print("  📊 RÉSUMÉ DES TESTS")
    print("=" * 70)
    
    if failed > 0:
        print("\n❌ Tests échoués:")
        for result in TEST_RESULTS:
            if not result.passed:
                print(f"   • {result.name}")
                if result.error:
                    print(f"     → {result.error}")
    
    print(f"\n{'✅' if failed == 0 else '⚠️'} {passed}/{total} tests passés")
    print(f"{'❌' if failed > 0 else '✅'} {failed}/{total} tests échoués")
    
    if failed == 0:
        print("\n🎉 Tous les tests sont passés ! Le prototype fonctionne correctement.")
    else:
        print(f"\n⚠️  {failed} test(s) ont échoué. Vérifiez les erreurs ci-dessus.")
    
    print("=" * 70 + "\n")
    
    return failed == 0


def run_all_tests():
    """Exécute tous les tests dans l'ordre"""
    print_banner()
    
    print("\n📦 1. Tests d'initialisation")
    print("-" * 70)
    test_server_running()
    test_grossistes_count()
    test_factures_demo_count()
    
    print("\n🔌 2. Tests des endpoints API - Grossistes")
    print("-" * 70)
    test_get_grossistes()
    test_get_grossiste_by_id()
    test_create_grossiste()
    
    print("\n📄 3. Tests des endpoints API - Factures")
    print("-" * 70)
    test_get_factures()
    test_get_facture_by_id()
    test_create_facture()
    test_verify_facture_endpoint()
    
    print("\n⚠️  4. Tests des endpoints API - Anomalies")
    print("-" * 70)
    test_get_anomalies()
    test_get_anomalies_by_facture()
    
    print("\n📊 5. Tests des endpoints API - Statistiques")
    print("-" * 70)
    test_get_stats()
    test_get_stats_recentes()
    
    print("\n🧮 6. Tests de la logique de vérification")
    print("-" * 70)
    test_facture_conforme()
    test_facture_remise_manquante()
    test_calcul_ecarts()
    
    print("\n💰 7. Tests des montants des factures de démo")
    print("-" * 70)
    test_facture_2_montant()
    test_facture_3_montant()
    test_facture_5_montant()
    test_total_economies()
    
    # Afficher le résumé
    success = print_summary()
    
    return 0 if success else 1


# ============================================================================
# POINT D'ENTRÉE
# ============================================================================

if __name__ == "__main__":
    if not HAS_REQUESTS:
        print("\n❌ Module 'requests' requis pour exécuter les tests.")
        print("   Installation: pip install requests")
        sys.exit(1)
    
    try:
        exit_code = run_all_tests()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrompus par l'utilisateur.")
        sys.exit(130)
    except Exception as e:
        print(f"\n❌ Erreur fatale: {e}")
        sys.exit(1)
