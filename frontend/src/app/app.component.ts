import { Component, HostListener, computed, inject, signal } from '@angular/core';
import {
  NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet
} from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

import { SettingsService } from './services/settings.service';
import { StoreService } from './services/store.service';
import { UiService } from './services/ui.service';
import { T } from './services/strings';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  protected settings = inject(SettingsService);
  protected store = inject(StoreService);
  private router = inject(Router);
  private ui = inject(UiService);
  protected T = T;

  protected isDark = computed(() => this.settings.theme() === 'dark');
  protected status = this.store.status;
  protected modalOpen = this.ui.modalOpen;

  /** Track current URL so we can hide chrome on non-home pages. */
  private currentUrl = signal<string>(this.router.url);

  /** The theme toggle only shows on the home page. */
  protected showThemeToggle = computed(() =>
    this.currentUrl() === '/' || this.currentUrl() === ''
  );

  protected statusTitle = computed(() => {
    switch (this.status()) {
      case 'saving':  return 'Saving changes…';
      case 'loading': return 'Loading from server…';
      case 'local':   return "Server unreachable. Your changes are saved on this device and will sync when it's back.";
      case 'idle':    return 'All changes saved';
    }
  });

  constructor() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(e => this.currentUrl.set((e as NavigationEnd).urlAfterRedirects));
  }

  protected toggleTheme(): void { this.settings.toggleTheme(); }

  /** Fire a one-shot bounce animation on a nav link, regardless of click duration. */
  protected onNavPress(el: HTMLElement): void {
    el.classList.remove('pressed');
    // Force reflow so re-adding the class restarts the animation
    void el.offsetWidth;
    el.classList.add('pressed');
    setTimeout(() => el.classList.remove('pressed'), 900);
  }

  /** Flush pending changes when the user closes/reloads the tab. */
  @HostListener('window:beforeunload')
  onBeforeUnload(): void { this.store.flush(); }
}
