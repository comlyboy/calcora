import { Injectable, effect, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'calcora:theme';
const THEME_COLOR_BY_MODE: Record<ThemeMode, string> = {
  dark: '#171717',
  light: '#f5f5f4',
};

@Injectable({
  providedIn: 'root',
})
export class Theme {
  readonly mode = signal<ThemeMode>(this.getInitialMode());

  constructor() {
    effect(() => this.applyMode(this.mode()));
  }

  toggle(): void {
    this.mode.update((currentMode) => (currentMode === 'dark' ? 'light' : 'dark'));
  }

  private getInitialMode(): ThemeMode {
    try {
      const storedMode = localStorage.getItem(STORAGE_KEY);
      if (storedMode === 'light' || storedMode === 'dark') {
        return storedMode;
      }
    } catch {
      // Storage unavailable (private browsing, etc.) — fall through to system preference.
    }

    const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches ?? false;
    return prefersLight ? 'light' : 'dark';
  }

  private applyMode(mode: ThemeMode): void {
    document.documentElement.classList.toggle('light', mode === 'light');
    document.documentElement.style.colorScheme = mode;

    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR_BY_MODE[mode]);

    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Storage unavailable — the preference just won't persist across sessions.
    }
  }
}
