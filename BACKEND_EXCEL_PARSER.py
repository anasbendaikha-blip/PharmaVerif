"""
Parser Excel/CSV pour le backend FastAPI
Copyright (c) 2026 Anas BENDAIKHA

À placer dans : backend/app/services/excel_parser.py
"""

import openpyxl
import pandas as pd
from pathlib import Path
from typing import Dict, List, Optional


class ExcelParser:
    """Parser pour fichiers Excel et CSV"""
    
    def __init__(self):
        """Initialiser le parser"""
        pass
    
    def parse_excel(self, file_path: str) -> Dict:
        """
        Parser un fichier Excel (.xlsx, .xls)
        
        Args:
            file_path: Chemin vers le fichier Excel
            
        Returns:
            Résultat du parsing avec données structurées
        """
        result = {
            "success": False,
            "method": "openpyxl",
            "data": None,
            "error": None
        }
        
        try:
            # Charger le workbook
            wb = openpyxl.load_workbook(file_path, data_only=True)
            sheet = wb.active
            
            # Convertir en liste de listes
            data = []
            for row in sheet.iter_rows(values_only=True):
                data.append(list(row))
            
            # Parser les données
            parsed_data = self._parse_sheet_data(data)
            
            result["data"] = parsed_data
            result["success"] = True
            
        except Exception as e:
            result["error"] = str(e)
        
        return result
    
    def parse_csv(self, file_path: str) -> Dict:
        """
        Parser un fichier CSV
        
        Args:
            file_path: Chemin vers le fichier CSV
            
        Returns:
            Résultat du parsing avec données structurées
        """
        result = {
            "success": False,
            "method": "pandas",
            "data": None,
            "error": None
        }
        
        try:
            # Essayer différents séparateurs
            separators = [';', ',', '\t']
            df = None
            
            for sep in separators:
                try:
                    df = pd.read_csv(file_path, sep=sep, encoding='utf-8')
                    if len(df.columns) > 1:
                        break
                except:
                    continue
            
            if df is None:
                raise Exception("Impossible de parser le CSV")
            
            # Convertir en liste de listes
            data = [df.columns.tolist()] + df.values.tolist()
            
            # Parser les données
            parsed_data = self._parse_sheet_data(data)
            
            result["data"] = parsed_data
            result["success"] = True
            
        except Exception as e:
            result["error"] = str(e)
        
        return result
    
    def _parse_sheet_data(self, data: List[List]) -> Dict:
        """
        Parser les données d'une feuille Excel/CSV
        
        Args:
            data: Liste de listes (lignes)
            
        Returns:
            Données structurées
        """
        # Même logique que le parser frontend TypeScript
        # mais en Python
        
        invoice_data = {
            "numero": None,
            "date": None,
            "grossiste": None,
            "lignes": [],
            "total_brut_ht": 0,
            "total_remises_lignes": 0,
            "remises_pied_facture": 0,
            "net_a_payer": 0,
            "metadata": {
                "format_detecte": "excel",
                "lignes_total": 0
            }
        }
        
        # Détecter la ligne d'en-tête
        header_row_index = self._find_header_row(data)
        
        if header_row_index is None:
            raise Exception("Impossible de détecter les en-têtes de colonnes")
        
        headers = data[header_row_index]
        
        # Détecter les index des colonnes
        col_indexes = self._detect_column_indexes(headers)
        
        # Parser les informations de facture (premières lignes)
        invoice_data.update(self._parse_invoice_header(data[:header_row_index]))
        
        # Parser les lignes de produits
        lignes = []
        total_brut = 0
        total_remises = 0
        
        for i in range(header_row_index + 1, len(data)):
            row = data[i]
            
            if not self._is_data_row(row):
                continue
            
            ligne = self._parse_product_line(row, col_indexes)
            
            if ligne and ligne.get("designation"):
                lignes.append(ligne)
                total_brut += ligne.get("total_ligne_ht", 0)
                total_remises += ligne.get("remise_montant", 0)
        
        invoice_data["lignes"] = lignes
        invoice_data["total_brut_ht"] = total_brut
        invoice_data["total_remises_lignes"] = total_remises
        invoice_data["metadata"]["lignes_total"] = len(lignes)
        
        # Parser le pied de facture (totaux)
        footer_data = self._parse_invoice_footer(data[-10:])
        invoice_data.update(footer_data)
        
        return invoice_data
    
    def _find_header_row(self, data: List[List]) -> Optional[int]:
        """Trouver l'index de la ligne d'en-tête"""
        
        keywords = ['designation', 'produit', 'total', 'prix', 'quantite']
        
        for i, row in enumerate(data):
            if not row:
                continue
            
            # Convertir en lowercase
            row_lower = [str(cell).lower() if cell else '' for cell in row]
            
            # Vérifier si contient des mots-clés
            matches = sum(1 for keyword in keywords if any(keyword in cell for cell in row_lower))
            
            if matches >= 2:
                return i
        
        return None
    
    def _detect_column_indexes(self, headers: List) -> Dict[str, int]:
        """Détecter les index des colonnes importantes"""
        
        mappings = {
            'designation': ['designation', 'produit', 'libelle', 'article'],
            'code': ['code', 'cip', 'reference', 'ref'],
            'quantite': ['quantite', 'qte', 'qty'],
            'prix_unitaire': ['prix unitaire', 'pu', 'prix ht'],
            'remise_pourcent': ['remise %', 'remise', 'taux'],
            'total_ligne': ['total', 'montant', 'total ht'],
        }
        
        col_indexes = {}
        
        headers_lower = [str(h).lower() if h else '' for h in headers]
        
        for key, keywords in mappings.items():
            for i, header in enumerate(headers_lower):
                if any(keyword in header for keyword in keywords):
                    col_indexes[key] = i
                    break
        
        return col_indexes
    
    def _parse_invoice_header(self, lines: List[List]) -> Dict:
        """Parser l'en-tête de facture"""
        
        import re
        from datetime import datetime
        
        header_data = {
            "numero": f"FAC-{datetime.now().timestamp()}",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "grossiste": None
        }
        
        for row in lines:
            if not row or len(row) < 2:
                continue
            
            first_cell = str(row[0]).lower() if row[0] else ''
            second_cell = str(row[1]) if len(row) > 1 and row[1] else ''
            
            if 'facture' in first_cell or 'numero' in first_cell or 'n°' in first_cell:
                header_data["numero"] = second_cell.strip()
            
            elif 'date' in first_cell:
                # Parser la date
                try:
                    date_str = second_cell.strip()
                    # Essayer plusieurs formats
                    for fmt in ['%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d']:
                        try:
                            parsed_date = datetime.strptime(date_str, fmt)
                            header_data["date"] = parsed_date.strftime("%Y-%m-%d")
                            break
                        except:
                            continue
                except:
                    pass
            
            elif 'grossiste' in first_cell or 'fournisseur' in first_cell:
                header_data["grossiste"] = second_cell.strip()
        
        return header_data
    
    def _is_data_row(self, row: List) -> bool:
        """Vérifier si une ligne est une ligne de données"""
        
        if not row:
            return False
        
        # Vérifier qu'il y a au moins un nombre
        has_number = False
        for cell in row:
            if isinstance(cell, (int, float)):
                has_number = True
                break
            elif isinstance(cell, str):
                try:
                    float(cell.replace(',', '.').replace(' ', ''))
                    has_number = True
                    break
                except:
                    pass
        
        if not has_number:
            return False
        
        # Vérifier que ce n'est pas une ligne de total
        first_cell = str(row[0]).lower() if row[0] else ''
        if any(keyword in first_cell for keyword in ['total', 'sous-total', 'net']):
            return False
        
        return True
    
    def _parse_product_line(self, row: List, col_indexes: Dict) -> Optional[Dict]:
        """Parser une ligne de produit"""
        
        try:
            ligne = {
                "designation": "",
                "code_produit": None,
                "quantite": 0,
                "prix_unitaire_ht": 0,
                "remise_pourcent": 0,
                "remise_montant": 0,
                "total_ligne_ht": 0,
            }
            
            # Designation
            if 'designation' in col_indexes:
                idx = col_indexes['designation']
                if idx < len(row):
                    ligne["designation"] = str(row[idx]) if row[idx] else ""
            
            # Code
            if 'code' in col_indexes:
                idx = col_indexes['code']
                if idx < len(row):
                    ligne["code_produit"] = str(row[idx]) if row[idx] else None
            
            # Quantité
            if 'quantite' in col_indexes:
                idx = col_indexes['quantite']
                if idx < len(row):
                    ligne["quantite"] = self._extract_number(row[idx])
            
            # Prix unitaire
            if 'prix_unitaire' in col_indexes:
                idx = col_indexes['prix_unitaire']
                if idx < len(row):
                    ligne["prix_unitaire_ht"] = self._extract_number(row[idx])
            
            # Remise %
            if 'remise_pourcent' in col_indexes:
                idx = col_indexes['remise_pourcent']
                if idx < len(row):
                    ligne["remise_pourcent"] = self._extract_number(row[idx])
            
            # Total ligne
            if 'total_ligne' in col_indexes:
                idx = col_indexes['total_ligne']
                if idx < len(row):
                    ligne["total_ligne_ht"] = self._extract_number(row[idx])
            
            # Calculer la remise montant
            if ligne["prix_unitaire_ht"] and ligne["quantite"]:
                brut = ligne["prix_unitaire_ht"] * ligne["quantite"]
                ligne["remise_montant"] = brut * (ligne["remise_pourcent"] / 100)
            
            return ligne
            
        except Exception as e:
            return None
    
    def _parse_invoice_footer(self, lines: List[List]) -> Dict:
        """Parser le pied de facture (totaux)"""
        
        footer_data = {
            "net_a_payer": 0,
            "remises_pied_facture": 0
        }
        
        for row in lines:
            if not row:
                continue
            
            first_cell = str(row[0]).lower() if row[0] else ''
            
            # Net à payer
            if 'net' in first_cell and 'payer' in first_cell:
                if len(row) > 1:
                    footer_data["net_a_payer"] = self._extract_number(row[-1])
            
            # Remises pied
            elif 'remise' in first_cell and 'pied' in first_cell:
                if len(row) > 1:
                    footer_data["remises_pied_facture"] = self._extract_number(row[-1])
        
        return footer_data
    
    def _extract_number(self, value) -> float:
        """Extraire un nombre depuis une valeur"""
        
        if isinstance(value, (int, float)):
            return float(value)
        
        if not value:
            return 0.0
        
        # Convertir en string et nettoyer
        str_value = str(value).replace(' ', '').replace(',', '.')
        
        # Supprimer symboles monétaires
        str_value = str_value.replace('€', '').replace('$', '')
        
        try:
            return float(str_value)
        except:
            return 0.0


# Instance singleton
excel_parser = ExcelParser()


# EXEMPLE D'UTILISATION
if __name__ == "__main__":
    parser = ExcelParser()
    
    # Test Excel
    result = parser.parse_excel("test_facture.xlsx")
    
    if result["success"]:
        print("✅ Parsing réussi !")
        print(f"Numéro: {result['data']['numero']}")
        print(f"Lignes: {len(result['data']['lignes'])}")
        print(f"Total: {result['data']['total_brut_ht']}€")
    else:
        print(f"❌ Erreur: {result['error']}")
