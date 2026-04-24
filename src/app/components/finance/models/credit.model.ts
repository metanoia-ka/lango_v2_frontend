export interface PackCredit {
  id: string;
  nom: string;
  description: string;
  prix_fcfa: number;
  nb_credits: number;
  bonus_credits: number;
  total_credits: number;
  cout_par_credit: number | null;
  est_actif: boolean;
  ordre: number;
}

export interface CreditCompte {
  id: string;
  username: string;
  solde: number;
  updated_at: string;
}

export type TypeTransaction = 'CREDIT' | 'DEBIT' | 'EXPIRATION' | 'REMBOURSEMENT';

export type CauseDebit =
  | 'ACHAT_PACK'
  | 'VOIR_PARCELLE'
  | 'VOIR_CHAINE'
  | 'CONTACTER_VENDOR'
  | 'EXPORT_PDF'
  | 'BOOST_ANNONCE'
  | 'ALERTE_ZONE'
  | 'RAPPORT_MARCHE'
  | 'REMBOURSEMENT'
  | 'RESERVATION_PARCELLE'
  | 'AUTRE';

export interface CreditTransaction {
  id: string;
  type_transaction: TypeTransaction;
  cause: CauseDebit;
  montant: number;
  solde_avant: number;
  solde_apres: number;
  description: string;
  reference_type: string;
  reference_id: string;
  created_at: string;
}

export type StatutAchat = 'PENDING' | 'CONFIRME' | 'ECHEC' | 'REMBOURSE';
export type MethodePaiement = 'MTN_MOMO' | 'ORANGE' | 'STRIPE' | 'MANUEL';

export interface AchatCredit {
  id: string;
  pack: string;
  pack_nom: string;
  statut: StatutAchat;
  statut_label: string;
  methode_paiement: MethodePaiement;
  methode_label: string;
  montant_fcfa: number;
  credits_octroyes: number;
  reference_paiement: string;
  created_at: string;
  confirmed_at: string | null;
}

export interface TarifAction {
  cause: CauseDebit;
  cause_label: string;
  cout: number;
  est_actif: boolean;
  description: string;
}

export interface SoldeCheck {
  solde: number;
  action?: CauseDebit;
  cout_action?: number;
  solde_suffisant?: boolean;
}

export interface InitAchatPayload {
  pack: string;          // UUID du pack
  methode_paiement: MethodePaiement;
}

export interface DebitResult {
  solde: number;
  transaction_id: string;
  montant_debite: number;
}

// Filtre pour l'historique des transactions
export interface TransactionFilters {
  type?: TypeTransaction;
  cause?: CauseDebit;
}

export interface MouvementCredit {
  id: string;                // UUID côté Django
  user: string;     // ID ou UUID de l'utilisateur
  user_username: string;     // Provient de ton Serializer (source='user.username')
  montant: number;
  type_mouvement: string;    // La valeur brute (ex: 'ACHAT', 'REMBOURSEMENT')
  type_display: string;      // Le libellé lisible (ex: 'Achat de pack')
  description: string;
  reference_id: string;
  reference_type: string;
  processed: boolean;
  created_at: string | Date; // ISO String provenant de Django
}

export interface ManuelRefundRequest {
  user_id: string; // UUID de l'utilisateur
  montant: number;
  raison: string;
}