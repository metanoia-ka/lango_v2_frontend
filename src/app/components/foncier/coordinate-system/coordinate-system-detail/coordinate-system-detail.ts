import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { CoordinateSystemService } from '../../services/coordinate-system';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { CoordinateSystem, CRS_OPERATION_ICON, CRS_OPERATION_LABELS, CrsOperation } from '../../models/coordinate-system.model';

@Component({
  selector: 'app-coordinate-system-detail',
  imports: [CommonModule],
  templateUrl: './coordinate-system-detail.html',
  styleUrl: './coordinate-system-detail.scss'
})
export class CoordinateSystemDetail implements OnInit {

  @Input({ required: true }) systemId!: string;

  private readonly svc  = inject(CoordinateSystemService);
  readonly activeModal  = inject(NgbActiveModal);

  system  = signal<CoordinateSystem | null>(null);
  loading = signal(true);
  error   = signal('');

  readonly OP_LABELS = CRS_OPERATION_LABELS;
  readonly OP_ICON   = CRS_OPERATION_ICON;
  readonly opKeys    = Object.keys(CRS_OPERATION_LABELS) as CrsOperation[];

  ngOnInit(): void {
    this.svc.getById(this.systemId).subscribe({
      next:  cs => { this.system.set(cs); this.loading.set(false); },
      error: ()  => { 
        this.error.set('Impossible de charger les métadonnées.'); 
        this.loading.set(false); 
      },
    });
  }

  hasOperation(op: CrsOperation): boolean {
    return this.system()?.supported_operations?.includes(op) ?? false;
  }

  formatBounds(bounds: [number, number, number, number] | null): string {
    if (!bounds) return '—';
    const [w, s, e, n] = bounds;
    return `O: ${w.toFixed(2)}° / S: ${s.toFixed(2)}° / 
            E: ${e.toFixed(2)}° / N: ${n.toFixed(2)}°`;
  }

}
