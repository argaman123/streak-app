import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type EngineState = 'stalled' | 'warming' | 'running' | 'cruising' | 'full-power';

/**
 * The engine bar — a metaphor for learning momentum.
 *
 * The frame:
 *   right now her learning engine doesn't run well and she can't push herself
 *   forward on her own. each day she studies builds the engine. as it gets
 *   stronger she can drive further by herself.
 *
 * Tiers (pace tuned so two solid weeks ≈ full power, not months):
 *   0 days       stalled
 *   1–3          warming
 *   4–7          running
 *   8–13         cruising
 *   14+          full power 🏎️
 *
 * Inputs:
 *   total: total days learned (fills the bar; full at 14 days)
 *   inRow: current streak (drives the car animation; bigger streak = faster car)
 */
@Component({
  selector: 'app-engine',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './engine.component.html',
  styleUrl: './engine.component.scss'
})
export class EngineComponent {
  @Input() total = 0;
  @Input() inRow = 0;

  /** Bar fill 0–100. Full at 14 total days. */
  get fillPct(): number {
    return Math.min(100, Math.max(2, (this.total / 14) * 100));
  }

  get state(): EngineState {
    if (this.total === 0)  return 'stalled';
    if (this.total <= 3)   return 'warming';
    if (this.total <= 7)   return 'running';
    if (this.total < 14)   return 'cruising';
    return 'full-power';
  }

  /** One short label that lives next to the bar. Gets more excited as the engine builds. */
  get label(): string {
    switch (this.state) {
      case 'stalled':    return 'engine off';
      case 'warming':    return 'warming up…';
      case 'running':    return 'engine ON 🔥';
      case 'cruising':   return 'CRUISING 🔥🔥';
      case 'full-power': return 'FULL POWER ⚡🔥';
    }
  }

  /** Car movement class — driven by the active streak. */
  get carClass(): string {
    if (this.inRow === 0) return 'idle';
    if (this.inRow < 3)   return 'slow';
    if (this.inRow < 7)   return 'steady';
    return 'fast';
  }
}
