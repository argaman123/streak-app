import { Component, Input, OnInit, OnDestroy, OnChanges, AfterViewInit, SimpleChanges, ViewChild, ElementRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { T } from '../../services/strings';

const POST_LOAD_DELAY_MS = 300;

@Component({
  selector: 'app-mascot',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mascot.component.html',
  styleUrl: './mascot.component.scss'
})
export class MascotComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('img', { static: true }) private imgRef?: ElementRef<HTMLImageElement>;

  @Input() streakTotal: number | undefined = undefined;
  @Input() freeStanding = false;
  @Input() onButton = false;
  @Input() isRunning = false;

  protected imageLoaded = signal(false);
  protected visible = signal(false);
  protected line = signal('');
  protected jumping = signal(false);
  protected bobbing = signal(false);
  protected hasJumped = signal(false);
  protected bubbleLeaving = signal(false);

  private bobTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingStart: (() => void) | null = null;

  ngOnInit(): void {
    const start = () => {
      if (this.onButton) {
        this.triggerJumpIn();
        return;
      }
      if (this.streakTotal === undefined) return;
      setTimeout(() => {
        const lines = T.mascotLines;
        this.line.set(lines[Math.floor(Math.random() * lines.length)]);
        this.visible.set(true);
        setTimeout(() => this.hideWithAnimation(), 4200);
      }, 900);
    };
    if (this.imageLoaded()) {
      setTimeout(start, POST_LOAD_DELAY_MS);
    } else {
      this.pendingStart = start;
    }
  }

  protected onImageLoad(): void {
    if (this.imageLoaded()) return;
    this.imageLoaded.set(true);
    const start = this.pendingStart;
    this.pendingStart = null;
    if (start) setTimeout(start, POST_LOAD_DELAY_MS);
  }

  ngAfterViewInit(): void {
    const el = this.imgRef?.nativeElement;
    if (el && el.complete && el.naturalWidth > 0) this.onImageLoad();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.onButton && changes['isRunning'] && !changes['isRunning'].firstChange) {
      this.triggerBob();
    }
  }

  ngOnDestroy(): void {
    if (this.bobTimer) clearTimeout(this.bobTimer);
  }

  private triggerJumpIn(): void {
    setTimeout(() => {
      const lines = T.mascotLines;
      this.line.set(lines[Math.floor(Math.random() * lines.length)]);
      this.jumping.set(true);
      // Bubble appears at moment of impact (73% through the 950ms animation)
      setTimeout(() => { this.visible.set(true); }, 694);
      setTimeout(() => {
        this.jumping.set(false);
        this.hasJumped.set(true);
        this.scheduleBob();
        setTimeout(() => this.hideWithAnimation(), 1500);
      }, 1000);
    }, 100);
  }

  private hideWithAnimation(): void {
    this.bubbleLeaving.set(true);
    setTimeout(() => {
      this.visible.set(false);
      this.line.set('');
      this.bubbleLeaving.set(false);
    }, 200);
  }

  private triggerBob(): void {
    this.bobbing.set(false);
    setTimeout(() => {
      this.bobbing.set(true);
      setTimeout(() => this.bobbing.set(false), 750);
    }, 30);
  }

  private scheduleBob(): void {
    // every ~2-3.5 seconds
    const delay = 2000 + Math.random() * 1500;
    this.bobTimer = setTimeout(() => {
      this.triggerBob();
      this.scheduleBob();
    }, delay);
  }
}
