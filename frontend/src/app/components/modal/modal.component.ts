import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiService } from '../../services/ui.service';

/**
 * Tiny modal wrapper. While open, sets UiService.modalOpen so the app shell
 * (bottom nav + theme button) can slide out of the way.
 */
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="overlay" (click)="onBackdropClick($event)">
      <div class="dialog" role="dialog" aria-modal="true">
        @if (title) {
          <header class="dialog-head">
            <h2>{{ title }}</h2>
            <button type="button" class="close" (click)="close.emit()" aria-label="Close"><span>×</span></button>
          </header>
        }
        <div class="dialog-body">
          <ng-content />
        </div>
      </div>
    </div>
  `,
  styleUrl: './modal.component.scss'
})
export class ModalComponent implements OnInit, OnDestroy {
  @Input() title?: string;
  @Output() close = new EventEmitter<void>();

  private ui = inject(UiService);

  ngOnInit(): void  { this.ui.modalOpen.set(true); }
  ngOnDestroy(): void { this.ui.modalOpen.set(false); }

  onBackdropClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.close.emit();
  }
}
