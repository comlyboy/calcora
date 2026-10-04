import { Component, inject } from '@angular/core';
import { Calculator } from './calculator/calculator';
import { InstallPromptModal } from './install-prompt-modal/install-prompt-modal';
import { Theme } from './core/theme';

@Component({
  imports: [Calculator, InstallPromptModal],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  /** Injected (not just imported) so it instantiates and applies the saved theme immediately on bootstrap. */
  private readonly theme = inject(Theme);
}
