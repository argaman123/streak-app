import { Injectable, effect, signal } from '@angular/core';

const KEY_THEME = 'frog-streak.theme';

export type Theme = 'light' | 'dark';

/**
 * Holds the user's theme preference. Applied to <html data-theme> so CSS
 * can react via :root[data-theme="dark"] selectors.
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  readonly theme = signal<Theme>(this.loadTheme());

  constructor() {
    effect(() => {
      const theme = this.theme();
      document.documentElement.dataset['theme'] = theme;
      // Match the browser chrome / iOS status bar color to the theme.
      const meta = document.querySelector('meta[name="theme-color"]:not([media])');
      if (meta) {
        meta.setAttribute('content', theme === 'dark' ? '#1F1A1C' : '#FFF6F0');
      }
      localStorage.setItem(KEY_THEME, theme);
    });
  }

  toggleTheme(): void {
    this.theme.set(this.theme() === 'light' ? 'dark' : 'light');
  }

  private loadTheme(): Theme {
    const saved = localStorage.getItem(KEY_THEME);
    if (saved === 'light' || saved === 'dark') return saved;
    return matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
