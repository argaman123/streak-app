import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { T } from '../../services/strings';

/**
 * Argaman the frog. Peeks from behind the streak card with a speech bubble
 * for a few seconds, then hides back down. Says a different line each visit.
 *
 * To edit what he says: open src/app/services/strings.ts → T.mascotLines.
 */
@Component({
  selector: 'app-mascot',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mascot.component.html',
  styleUrl: './mascot.component.scss'
})
export class MascotComponent implements OnInit {
  @Input() streakTotal: number | undefined = undefined;
  @Input() freeStanding = false;

  protected visible = signal(false);
  protected line = signal('');

  ngOnInit(): void {
    if (this.streakTotal === undefined) return;

    setTimeout(() => {
      const lines = T.mascotLines;
      this.line.set(lines[Math.floor(Math.random() * lines.length)]);
      this.visible.set(true);
      setTimeout(() => this.visible.set(false), 4200);
    }, 900);
  }
}
