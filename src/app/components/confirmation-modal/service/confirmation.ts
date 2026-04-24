import { inject, Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { ConfirmationModal } from "../confirmation-modal";

@Injectable({ providedIn: 'root' })
export class ConfirmationService {

  private modal = inject(NgbModal)

  /**
   * Ouvre une boîte de confirmation réutilisable
   * @param title Titre du modal
   * @param message Message de confirmation
   * @param type Couleur de l’en-tête ('bg-success' | 'bg-danger')
   * @param icon Icon du bouton de confirmation ('bi-trash' | 'bi-save')
   * @param  zonePhraseOne: string = '';
   * @param  zonePhraseTwo: string = '';
   * @param  zonePhraseThree: string = '';
   * @param  iconMessageSmall: string = '';
   * @param  iconMessageBig: string = '';
   * @param  requireMotif: boolean = false;
   * @param  motifLabel: string = 10;
   * @param  motifMinLength: number = '';
   * @returns Promise<string | boolean> -> true si confirmé, false sinon
   */
  confirm(
    options: {
      title?: string,
      message?: string,
      type?: 'bg-success' | 'bg-danger' | 'bg-warning' 
              | 'bg-info' | 'bg-secondary' | 'bg-primary',
      icon?: 'bi-trash' | 'bi-save' | 'bi-x-circle' | 'bi-check-circle' | 'bi-patch-check'
              | 'bi-check2-circle' | 'bi-archive' | 'bi-bell' | 'bi-box-arrow-right' 
              | 'bi-file-earmark' | 'bi-x-octagon' | 'bi-bell-slash' | 'bi-plus-circle-fill'
              | 'bi-clock' | 'bi-calendar-check' | 'bi-exclamation-triangle'
      confirmLabel?: string,
      cancelLabel?: string,
      zonePhraseOne?: string,
      zonePhraseTwo?: string,
      zonePhraseThree?: string,
      iconMessageSmall?:string,
      iconMessageBig?: string,
      requireMotif?:    boolean,   // ← nouveau
      motifLabel?:      string,    // ← libellé du champ motif (optionnel)
      motifMinLength?:  number,
      size?: 'sm' | 'md' | 'lg' | 'xl'
    } | string = {}
  ): Promise<string | boolean>  {

    const opts = typeof options === 'string' ? { title: options } : options;

    const config = {
      title: 'Confirmer',
      message: 'Voulez-vous vraiment continuer ?',
      type: 'bg-success',
      icon: 'bi-check2-circle',
      confirmLabel: '',
      cancelLabel: '',
      zonePhraseOne: '',
      zonePhraseTwo: '',
      zonePhraseThree: '',
      iconMessageSmall:'',
      iconMessageBig: '',
      requireMotif:     false,
      motifLabel:       'Motif de suppression',
      motifMinLength:   10,
      size: 'md',
      ...opts
    }

    const modalRef = this.modal.open(ConfirmationModal, {
      centered: true,
      backdrop: 'static',
      size:     config.size,
      keyboard: false
    });
    
    Object.assign(modalRef.componentInstance, config)

    return modalRef.result
      .then(
        (result) => {
        if (config.requireMotif) {
          // Le modal renvoie le motif saisi sous forme de string
          return typeof result === 'string' && result.trim().length > 0
            ? result.trim()
            : false;
        }
        return !!result;
      }
      )
      .catch(() => false);
  }

  // Ajouter cette méthode au ConfirmationService existant

  inform(
    options: {
      title?:      string;
      message?:    string;
      type?:       'bg-success' | 'bg-danger' | 'bg-warning'
                   | 'bg-info' | 'bg-secondary' | 'bg-primary';
      icon?:       string;
      detail?:     string;        // détail supplémentaire (optionnel)
      closeLabel?: string;
      context?:    'create' | 'update' | 'delete' | 'submit' | 'info';
      size?:       'sm' | 'md' | 'lg';
      // Pour usage futur — feedback, audit, etc.
      onClose?:    () => void;
    } | string = {}
  ): Promise<void> {

    const opts   = typeof options === 'string' ? { message: options } : options;
    const config = {
      title:      'Information',
      message:    '',
      type:       'bg-info',
      icon:       'bi-info-circle',
      closeLabel: 'Compris',
      context:    'info',
      detail:     '',
      size:       'md',
      infoMode:   true,           // ← flag pour le template
      ...opts,
    };

    const modalRef = this.modal.open(ConfirmationModal, {
      centered: true,
      backdrop: true,             // ← cliquable pour fermer (pas static)
      size:     config.size,
      keyboard: true,             // ← Echap pour fermer
    });

    Object.assign(modalRef.componentInstance, config);

    return modalRef.result
      .then(() => { opts.onClose?.(); })
      .catch(() => { opts.onClose?.(); });
  }

  async confirmCreate(entity: string = 'cet élément') {
    
    return this.confirm({
      title: 'Confirmation',
      type: 'bg-success',
      icon: 'bi-plus-circle-fill',
      message: `Êtes-vous sûr de vouloir créer ${entity} ?`,
      iconMessageSmall: '✅',
      iconMessageBig: '🗂️',
      confirmLabel: 'Oui, créer',
      cancelLabel: 'Annuler'
    })
  }

  async confirmUpdate(entity: string = 'cet élément') {
    
    return this.confirm({
      title: 'Confirmation',
      type: 'bg-warning',
      icon: 'bi-check2-circle',
      message: `Êtes-vous sûr de vouloir modifier ${entity} ?`,
      iconMessageSmall: '🔁',
      iconMessageBig: '🗂️',
      confirmLabel: 'Oui, modifier',
      cancelLabel: 'Annuler'
    })
  }

  async confirmDelete(entity: string = 'cet élément') {
    
    return this.confirm({
      title: 'Suppression',
      type: 'bg-danger',
      icon: 'bi-trash',
      message: `Êtes-vous sûr de vouloir supprimer ${entity} ?`,
      iconMessageSmall: '🚫',
      iconMessageBig: '❌',
      confirmLabel: 'Oui, supprimer',
      cancelLabel: 'Annuler'
    })
  }
}