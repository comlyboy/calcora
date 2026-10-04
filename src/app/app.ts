import { Component } from '@angular/core';
import { Calculator } from './calculator/calculator';
import { InstallPromptModal } from './install-prompt-modal/install-prompt-modal';

@Component({
  imports: [Calculator, InstallPromptModal],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {}
