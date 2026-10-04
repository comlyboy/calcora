import { Component, computed, signal } from '@angular/core';

export enum CalculatorOperator {
  ADD = '+',
  SUBTRACT = '−',
  MULTIPLY = '×',
  DIVIDE = '÷',
}

export enum CalculatorButtonType {
  DIGIT = 'DIGIT',
  DECIMAL = 'DECIMAL',
  OPERATOR = 'OPERATOR',
  ACTION = 'ACTION',
  EQUALS = 'EQUALS',
}

export interface CalculatorButtonConfig {
  label: string;
  type: CalculatorButtonType;
  operator?: CalculatorOperator;
  wide?: boolean;
}

const MAXIMUM_DISPLAY_DIGITS = 12;

@Component({
  imports: [],
  selector: 'app-calculator',
  styleUrl: './calculator.css',
  templateUrl: './calculator.html',
})
export class Calculator {
  protected readonly CalculatorButtonType = CalculatorButtonType;

  protected readonly buttonRows: readonly (readonly CalculatorButtonConfig[])[] = [
    [
      { label: 'AC', type: CalculatorButtonType.ACTION },
      { label: '+/−', type: CalculatorButtonType.ACTION },
      { label: '%', type: CalculatorButtonType.ACTION },
      { label: '÷', type: CalculatorButtonType.OPERATOR, operator: CalculatorOperator.DIVIDE },
    ],
    [
      { label: '7', type: CalculatorButtonType.DIGIT },
      { label: '8', type: CalculatorButtonType.DIGIT },
      { label: '9', type: CalculatorButtonType.DIGIT },
      { label: '×', type: CalculatorButtonType.OPERATOR, operator: CalculatorOperator.MULTIPLY },
    ],
    [
      { label: '4', type: CalculatorButtonType.DIGIT },
      { label: '5', type: CalculatorButtonType.DIGIT },
      { label: '6', type: CalculatorButtonType.DIGIT },
      { label: '−', type: CalculatorButtonType.OPERATOR, operator: CalculatorOperator.SUBTRACT },
    ],
    [
      { label: '1', type: CalculatorButtonType.DIGIT },
      { label: '2', type: CalculatorButtonType.DIGIT },
      { label: '3', type: CalculatorButtonType.DIGIT },
      { label: '+', type: CalculatorButtonType.OPERATOR, operator: CalculatorOperator.ADD },
    ],
    [
      { label: '0', type: CalculatorButtonType.DIGIT, wide: true },
      { label: '.', type: CalculatorButtonType.DECIMAL },
      { label: '=', type: CalculatorButtonType.EQUALS },
    ],
  ];

  private readonly displayValue = signal('0');
  private readonly storedOperand = signal<number | null>(null);
  private readonly pendingOperator = signal<CalculatorOperator | null>(null);
  private readonly isEnteringNewOperand = signal(true);

  protected readonly formattedDisplayValue = computed(() => this.displayValue());
  protected readonly expression = computed(() => {
    const operand = this.storedOperand();
    const operator = this.pendingOperator();
    return operand === null || operator === null ? '' : `${operand} ${operator}`;
  });

  protected inputDigit(digit: string): void {
    if (this.isEnteringNewOperand()) {
      this.displayValue.set(digit);
      this.isEnteringNewOperand.set(false);
      return;
    }

    if (this.displayValue().replace(/[-.]/g, '').length >= MAXIMUM_DISPLAY_DIGITS) {
      return;
    }

    this.displayValue.set(this.displayValue() === '0' ? digit : this.displayValue() + digit);
  }

  protected inputDecimalPoint(): void {
    if (this.isEnteringNewOperand()) {
      this.displayValue.set('0.');
      this.isEnteringNewOperand.set(false);
      return;
    }

    if (!this.displayValue().includes('.')) {
      this.displayValue.set(this.displayValue() + '.');
    }
  }

  protected chooseOperator(operator: CalculatorOperator): void {
    const currentValue = Number(this.displayValue());

    if (this.storedOperand() !== null && !this.isEnteringNewOperand()) {
      this.displayValue.set(this.formatResult(this.applyOperator(this.storedOperand()!, currentValue, this.pendingOperator()!)));
      this.storedOperand.set(Number(this.displayValue()));
    } else {
      this.storedOperand.set(currentValue);
    }

    this.pendingOperator.set(operator);
    this.isEnteringNewOperand.set(true);
  }

  protected calculateResult(): void {
    const operand = this.storedOperand();
    const operator = this.pendingOperator();

    if (operand === null || operator === null) {
      return;
    }

    const currentValue = Number(this.displayValue());
    this.displayValue.set(this.formatResult(this.applyOperator(operand, currentValue, operator)));
    this.storedOperand.set(null);
    this.pendingOperator.set(null);
    this.isEnteringNewOperand.set(true);
  }

  protected toggleSign(): void {
    if (this.displayValue() === '0') {
      return;
    }

    this.displayValue.set(this.displayValue().startsWith('-') ? this.displayValue().slice(1) : '-' + this.displayValue());
  }

  protected applyPercent(): void {
    this.displayValue.set(this.formatResult(Number(this.displayValue()) / 100));
  }

  protected clearAll(): void {
    this.displayValue.set('0');
    this.storedOperand.set(null);
    this.pendingOperator.set(null);
    this.isEnteringNewOperand.set(true);
  }

  protected handleButtonPress(button: CalculatorButtonConfig): void {
    switch (button.type) {
      case CalculatorButtonType.DIGIT:
        this.inputDigit(button.label);
        break;
      case CalculatorButtonType.DECIMAL:
        this.inputDecimalPoint();
        break;
      case CalculatorButtonType.OPERATOR:
        this.chooseOperator(button.operator!);
        break;
      case CalculatorButtonType.EQUALS:
        this.calculateResult();
        break;
      case CalculatorButtonType.ACTION:
        this.handleAction(button.label);
        break;
    }
  }

  private handleAction(label: string): void {
    if (label === 'AC') {
      this.clearAll();
    } else if (label === '+/−') {
      this.toggleSign();
    } else if (label === '%') {
      this.applyPercent();
    }
  }

  private applyOperator(leftOperand: number, rightOperand: number, operator: CalculatorOperator): number {
    switch (operator) {
      case CalculatorOperator.ADD:
        return leftOperand + rightOperand;
      case CalculatorOperator.SUBTRACT:
        return leftOperand - rightOperand;
      case CalculatorOperator.MULTIPLY:
        return leftOperand * rightOperand;
      case CalculatorOperator.DIVIDE:
        return rightOperand === 0 ? NaN : leftOperand / rightOperand;
    }
  }

  private formatResult(value: number): string {
    if (Number.isNaN(value)) {
      return 'Error';
    }

    return Number(value.toPrecision(MAXIMUM_DISPLAY_DIGITS)).toString();
  }
}
