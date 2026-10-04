import { Component, inject } from '@angular/core';
import { InstallPrompt } from '../core/install-prompt';

@Component({
  imports: [],
  selector: 'app-install-prompt-modal',
  styleUrl: './install-prompt-modal.css',
  templateUrl: './install-prompt-modal.html',
})
export class InstallPromptModal {
  private readonly installPrompt = inject(InstallPrompt);

  protected readonly variant = this.installPrompt.variant;

  protected install(): void {
    void this.installPrompt.promptInstall();
  }

  protected dismiss(): void {
    this.installPrompt.dismiss();
  }
}
