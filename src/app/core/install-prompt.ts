import { Injectable, signal } from '@angular/core';

export type InstallPromptVariant = 'android' | 'ios';

interface BeforeInstallPromptEvent extends Event {
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  prompt(): Promise<void>;
}

const DISMISSED_UNTIL_STORAGE_KEY = 'calcora:install-prompt-dismissed-until';
const DISMISSAL_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable({
  providedIn: 'root',
})
export class InstallPrompt {
  private deferredInstallEvent: BeforeInstallPromptEvent | null = null;

  /** null = nothing to show. 'android' = we can trigger the native install prompt. 'ios' = show manual "Add to Home Screen" instructions. */
  readonly variant = signal<InstallPromptVariant | null>(null);

  constructor() {
    if (this.isRunningStandalone() || this.isDismissedWithinCooldown()) {
      return;
    }

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferredInstallEvent = event as BeforeInstallPromptEvent;
      this.variant.set('android');
    });

    window.addEventListener('appinstalled', () => {
      this.deferredInstallEvent = null;
      this.variant.set(null);
    });

    if (this.isIosSafari()) {
      this.variant.set('ios');
    }
  }

  async promptInstall(): Promise<void> {
    const installEvent = this.deferredInstallEvent;
    if (!installEvent) {
      return;
    }

    this.deferredInstallEvent = null;
    this.variant.set(null);
    await installEvent.prompt();
    await installEvent.userChoice;
  }

  dismiss(): void {
    this.variant.set(null);

    try {
      localStorage.setItem(DISMISSED_UNTIL_STORAGE_KEY, String(Date.now() + DISMISSAL_COOLDOWN_MS));
    } catch {
      // Storage unavailable (private browsing, etc.) — nothing to persist, just stop showing it this session.
    }
  }

  private isRunningStandalone(): boolean {
    const isStandaloneDisplayMode = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
    const isIosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
    return isStandaloneDisplayMode || isIosStandalone;
  }

  private isIosSafari(): boolean {
    const userAgent = window.navigator.userAgent;
    const isIosDevice = /iphone|ipad|ipod/i.test(userAgent);
    const isSafariBrowser = /safari/i.test(userAgent) && !/crios|fxios|edgios/i.test(userAgent);
    return isIosDevice && isSafariBrowser;
  }

  private isDismissedWithinCooldown(): boolean {
    try {
      const dismissedUntil = Number(localStorage.getItem(DISMISSED_UNTIL_STORAGE_KEY));
      return Number.isFinite(dismissedUntil) && Date.now() < dismissedUntil;
    } catch {
      return false;
    }
  }
}
