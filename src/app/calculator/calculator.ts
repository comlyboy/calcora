import { NgClass } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { CalculationHistory } from '../core/calculation-history';

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
  CLEAR = 'CLEAR',
  EQUALS = 'EQUALS',
}

export interface CalculatorButtonConfig {
  label: string;
  type: CalculatorButtonType;
  operator?: CalculatorOperator;
  columnSpan?: 2 | 3;
}

const MAXIMUM_DISPLAY_DIGITS = 12;

@Component({
  imports: [NgClass],
  selector: 'app-calculator',
  styleUrl: './calculator.css',
  templateUrl: './calculator.html',
})
export class Calculator {
  private readonly calculationHistory = inject(CalculationHistory);

  protected readonly CalculatorButtonType = CalculatorButtonType;
  protected readonly history = this.calculationHistory.entries;
  protected readonly isHistoryPanelOpen = signal(false);

  protected readonly buttonRows: readonly (readonly CalculatorButtonConfig[])[] = [
    [
      { label: 'AC', type: CalculatorButtonType.CLEAR, columnSpan: 3 },
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
      { label: '0', type: CalculatorButtonType.DIGIT, columnSpan: 2 },
      { label: '.', type: CalculatorButtonType.DECIMAL },
      { label: '=', type: CalculatorButtonType.EQUALS },
    ],
  ];

  private readonly displayValue = signal('0');
  private readonly storedOperand = signal<number | null>(null);
  private readonly pendingOperator = signal<CalculatorOperator | null>(null);
  private readonly isEnteringNewOperand = signal(true);

  protected readonly buttonGridTemplateRows = `repeat(${this.buttonRows.length}, minmax(0, 1fr))`;

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
    const resultValue = this.formatResult(this.applyOperator(operand, currentValue, operator));
    const fullExpression = `${operand} ${operator} ${currentValue}`;

    this.displayValue.set(resultValue);
    this.storedOperand.set(null);
    this.pendingOperator.set(null);
    this.isEnteringNewOperand.set(true);

    void this.calculationHistory.recordCalculation(fullExpression, resultValue);
  }

  protected clearAll(): void {
    this.displayValue.set('0');
    this.storedOperand.set(null);
    this.pendingOperator.set(null);
    this.isEnteringNewOperand.set(true);
  }

  protected toggleHistoryPanel(): void {
    this.isHistoryPanelOpen.update((isOpen) => !isOpen);
  }

  protected formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  protected buttonClasses(button: CalculatorButtonConfig): Record<string, boolean> {
    const isOperatorStyled = button.type === CalculatorButtonType.OPERATOR || button.type === CalculatorButtonType.EQUALS;
    const isDigitStyled = button.type === CalculatorButtonType.DIGIT || button.type === CalculatorButtonType.DECIMAL;
    const isWide = button.columnSpan === 2 || button.columnSpan === 3;

    return {
      'col-span-2': button.columnSpan === 2,
      'col-span-3': button.columnSpan === 3,
      'bg-orange-500': isOperatorStyled,
      'hover:bg-orange-400': isOperatorStyled,
      'bg-neutral-500': button.type === CalculatorButtonType.CLEAR,
      'hover:bg-neutral-400': button.type === CalculatorButtonType.CLEAR,
      'bg-neutral-700': isDigitStyled,
      'hover:bg-neutral-600': isDigitStyled,
      'justify-start': isWide,
      'pl-7': isWide,
    };
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
      case CalculatorButtonType.CLEAR:
        this.clearAll();
        break;
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
