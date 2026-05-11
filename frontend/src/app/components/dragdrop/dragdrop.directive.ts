import {
  Directive, ElementRef, EventEmitter, HostListener, inject, Input, Output
} from '@angular/core';

/**
 * Drag-to-reorder for a vertical list.
 *
 * How it works:
 *  1. On pointerdown: snapshot the original position of every item (rects).
 *  2. On pointermove: translate the dragged item via CSS transform (it stays
 *     in its original DOM slot the whole time). Other items get a transform
 *     too — they slide up or down to make room — so the user can SEE where
 *     the drop will land.
 *  3. On pointerup: emit the new id order ONCE. Angular re-renders, all the
 *     transient transforms are cleared.
 *
 * Markup:
 *   <div appDragList [appDragListIds]="ids" (appDragReorder)="onReorder($event)">
 *     <div appDragItem [appDragItemId]="item.id" [attr.data-drag-id]="item.id">
 *       <span data-drag-handle>⠿</span>
 *       …row content…
 *     </div>
 *   </div>
 */

@Directive({
  selector: '[appDragList]',
  standalone: true
})
export class DragListDirective {
  @Input('appDragListIds') ids: string[] = [];
  @Output('appDragReorder') reorder = new EventEmitter<string[]>();

  emit(newIds: string[]): void { this.reorder.emit(newIds); }
}

@Directive({
  selector: '[appDragItem]',
  standalone: true
})
export class DragItemDirective {
  @Input('appDragItemId') itemId!: string;

  private list = inject(DragListDirective);
  private host = inject(ElementRef) as ElementRef<HTMLElement>;

  // Drag state
  private dragging = false;
  private startY = 0;
  private originalIndex = 0;
  private currentTargetIndex = 0;
  private siblings: HTMLElement[] = [];
  private rowHeight = 0;

  @HostListener('pointerdown', ['$event'])
  onDown(e: PointerEvent): void {
    const target = e.target as HTMLElement;
    if (!target.closest('[data-drag-handle]')) return;
    e.preventDefault();
    e.stopPropagation();

    const container = this.host.nativeElement.parentElement;
    if (!container) return;

    this.siblings = Array.from(container.querySelectorAll<HTMLElement>('[data-drag-id]'));
    this.originalIndex = this.siblings.indexOf(this.host.nativeElement);
    if (this.originalIndex === -1) return;

    const rect = this.host.nativeElement.getBoundingClientRect();
    this.rowHeight = rect.height + 6;

    this.dragging = true;
    this.startY = e.clientY;
    this.currentTargetIndex = this.originalIndex;
    this.host.nativeElement.classList.add('dragging');
    this.host.nativeElement.style.zIndex = '20';
    try { this.host.nativeElement.setPointerCapture(e.pointerId); } catch {}
  }

  @HostListener('pointermove', ['$event'])
  onMove(e: PointerEvent): void {
    if (!this.dragging) return;

    const deltaY = e.clientY - this.startY;
    // Translate the dragged row to follow the pointer.
    this.host.nativeElement.style.transform =
      `translateY(${deltaY}px) scale(1.02)`;

    // Decide where the drop would land based on midpoints of the OTHER rows.
    let target = this.originalIndex;
    for (let i = 0; i < this.siblings.length; i++) {
      if (i === this.originalIndex) continue;
      const sib = this.siblings[i];
      const r = sib.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      if (i < this.originalIndex && e.clientY < mid) { target = i; break; }
      if (i > this.originalIndex && e.clientY > mid) { target = i; }
    }

    if (target !== this.currentTargetIndex) {
      this.currentTargetIndex = target;
      this.applyShifts();
    }
  }

  @HostListener('pointerup', ['$event'])
  @HostListener('pointercancel', ['$event'])
  onUp(e: PointerEvent): void {
    if (!this.dragging) return;
    this.dragging = false;

    const moved = this.currentTargetIndex !== this.originalIndex;

    // Reset visual state (transforms etc.) BEFORE emitting so Angular
    // re-renders into a clean DOM.
    this.clearShifts();
    this.host.nativeElement.style.transform = '';
    this.host.nativeElement.style.zIndex = '';
    this.host.nativeElement.classList.remove('dragging');
    try { this.host.nativeElement.releasePointerCapture(e.pointerId); } catch {}

    if (moved) {
      const newIds = [...this.list.ids];
      const [item] = newIds.splice(this.originalIndex, 1);
      newIds.splice(this.currentTargetIndex, 0, item);
      this.list.emit(newIds);
    }
  }

  /**
   * Slide the OTHER rows up/down by one row-height to indicate the drop slot.
   *
   * If dragging row 3 to slot 1: rows at index 1 and 2 shift down by one row.
   * If dragging row 1 to slot 3: rows at index 2 and 3 shift up by one row.
   */
  private applyShifts(): void {
    const orig = this.originalIndex;
    const target = this.currentTargetIndex;

    for (let i = 0; i < this.siblings.length; i++) {
      if (i === orig) continue;
      const sib = this.siblings[i];

      let shift = 0;
      if (target < orig && i >= target && i < orig)        shift =  this.rowHeight;
      else if (target > orig && i > orig && i <= target)   shift = -this.rowHeight;

      sib.style.transform = shift ? `translateY(${shift}px)` : '';
      sib.style.transition = 'transform 0.18s cubic-bezier(0.34, 1.4, 0.64, 1)';
    }
  }

  private clearShifts(): void {
    for (const sib of this.siblings) {
      if (sib === this.host.nativeElement) continue;
      sib.style.transform = '';
      // Let the inline transition fade out, then strip it in the next frame.
      requestAnimationFrame(() => { sib.style.transition = ''; });
    }
  }
}
