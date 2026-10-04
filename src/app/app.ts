import { Component } from '@angular/core';
import { Calculator } from './calculator/calculator';

@Component({
  imports: [Calculator],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {}
