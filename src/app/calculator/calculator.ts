import { DatePipe, NgClass } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
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
const CALCULATOR_OPERATORS: readonly string[] = Object.values(CalculatorOperator);

@Component({
  imports: [NgClass],
  providers: [DatePipe],
  selector: 'app-calculator',
  styleUrl: './calculator.css',
  templateUrl: './calculator.html',
})
export class Calculator {
  private readonly calculationHistory = inject(CalculationHistory);
  private readonly datePipe = inject(DatePipe);
  private readonly destroyRef = inject(DestroyRef);

  /** Ticks every 30s so relative timestamps ("2 mins ago") stay fresh while the history panel is open. */
  private readonly now = signal(Date.now());

  constructor() {
    const intervalId = setInterval(() => this.now.set(Date.now()), 30_000);
    this.destroyRef.onDestroy(() => clearInterval(intervalId));
  }

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
      { label: '0', type: CalculatorButtonType.DIGIT },
      { label: '00', type: CalculatorButtonType.DIGIT },
      { label: '.', type: CalculatorButtonType.DECIMAL },
      { label: '=', type: CalculatorButtonType.EQUALS },
    ],
  ];

  protected readonly buttonGridTemplateRows = `repeat(${this.buttonRows.length}, minmax(0, min(4.5rem, 1fr)))`;

  /** The expression tokens typed so far, alternating operand and operator strings, e.g. ['230', '+', '250']. */
  private readonly tokens = signal<string[]>([]);
  private readonly isEnteringNewOperand = signal(true);
  private readonly hasResult = signal(false);
  private readonly lastEvaluatedExpression = signal('');

  /** The big display: the full expression growing as it's typed, or just the result once "=" is pressed. */
  protected readonly formattedDisplayValue = computed(() => {
    const currentTokens = this.tokens();
    if (currentTokens.length === 0) {
      return '0';
    }
    return currentTokens.map((token) => (this.isOperatorToken(token) ? token : this.formatOperandWithCommas(token))).join('');
  });
  /** The small line above the display: the completed expression, shown once "=" is pressed. */
  protected readonly expression = computed(() =>
    this.hasResult() ? `${this.formatExpressionText(this.lastEvaluatedExpression())} =` : '',
  );

  protected inputDigit(digit: string): void {
    if (this.hasResult()) {
      this.tokens.set([digit === '00' ? '0' : digit]);
      this.hasResult.set(false);
      this.isEnteringNewOperand.set(false);
      return;
    }

    if (this.isEnteringNewOperand() || this.tokens().length === 0) {
      this.tokens.update((current) => [...current, digit === '00' ? '0' : digit]);
      this.isEnteringNewOperand.set(false);
      return;
    }

    this.tokens.update((current) => {
      const updatedTokens = [...current];
      const currentOperand = updatedTokens[updatedTokens.length - 1];

      if (currentOperand.replace(/[-.]/g, '').length >= MAXIMUM_DISPLAY_DIGITS) {
        return current;
      }

      updatedTokens[updatedTokens.length - 1] = currentOperand === '0' ? (digit === '00' ? '0' : digit) : currentOperand + digit;
      return updatedTokens;
    });
  }

  protected inputDecimalPoint(): void {
    if (this.hasResult()) {
      this.tokens.set(['0.']);
      this.hasResult.set(false);
      this.isEnteringNewOperand.set(false);
      return;
    }

    if (this.isEnteringNewOperand() || this.tokens().length === 0) {
      this.tokens.update((current) => [...current, '0.']);
      this.isEnteringNewOperand.set(false);
      return;
    }

    this.tokens.update((current) => {
      const updatedTokens = [...current];
      const currentOperand = updatedTokens[updatedTokens.length - 1];

      if (!currentOperand.includes('.')) {
        updatedTokens[updatedTokens.length - 1] = currentOperand + '.';
      }

      return updatedTokens;
    });
  }

  protected chooseOperator(operator: CalculatorOperator): void {
    if (this.tokens().length === 0) {
      this.tokens.set(['0']);
    }

    if (this.hasResult()) {
      this.hasResult.set(false);
    } else if (this.isOperatorToken(this.tokens()[this.tokens().length - 1])) {
      this.tokens.update((current) => {
        const updatedTokens = [...current];
        updatedTokens[updatedTokens.length - 1] = operator;
        return updatedTokens;
      });
      return;
    }

    this.tokens.update((current) => [...current, operator]);
    this.isEnteringNewOperand.set(true);
  }

  protected calculateResult(): void {
    const currentTokens = this.tokens();

    if (currentTokens.length < 3 || this.isOperatorToken(currentTokens[currentTokens.length - 1])) {
      return;
    }

    const fullExpression = currentTokens.join(' ');
    const resultValue = this.formatResult(this.evaluateTokens(currentTokens));

    this.lastEvaluatedExpression.set(fullExpression);
    this.tokens.set([resultValue]);
    this.hasResult.set(true);
    this.isEnteringNewOperand.set(false);

    void this.calculationHistory.recordCalculation(fullExpression, resultValue);
  }

  protected clearAll(): void {
    this.tokens.set([]);
    this.hasResult.set(false);
    this.isEnteringNewOperand.set(true);
    this.lastEvaluatedExpression.set('');
  }

  protected toggleHistoryPanel(): void {
    this.isHistoryPanelOpen.update((isOpen) => !isOpen);
  }

  protected formatExpressionText(expressionText: string): string {
    return expressionText
      .split(' ')
      .map((token) => (this.isOperatorToken(token) ? token : this.formatOperandWithCommas(token)))
      .join(' ');
  }

  protected formatOperandWithCommas(operand: string): string {
    if (!/^-?\d+(\.\d*)?$/.test(operand)) {
      return operand;
    }

    const isNegative = operand.startsWith('-');
    const unsignedOperand = isNegative ? operand.slice(1) : operand;
    const [integerPart, decimalPart] = unsignedOperand.split('.');
    const groupedIntegerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const hasDecimalPoint = unsignedOperand.includes('.');

    return `${isNegative ? '-' : ''}${groupedIntegerPart}${hasDecimalPoint ? '.' + (decimalPart ?? '') : ''}`;
  }

  /** "2 mins ago" / "1 hour ago" / "Yesterday, 1:30pm" / "4th Oct, 2026. 1:30pm", depending on how old the entry is. */
  protected formatHistoryTimestamp(timestamp: string): string {
    const entryDate = new Date(timestamp);
    const currentDate = new Date(this.now());
    const diffMinutes = Math.floor((currentDate.getTime() - entryDate.getTime()) / 60_000);

    if (diffMinutes < 1) {
      return 'Just now';
    }

    if (diffMinutes < 60) {
      return `${diffMinutes} min${diffMinutes === 1 ? '' : 's'} ago`;
    }

    if (this.isSameCalendarDay(entryDate, currentDate)) {
      const diffHours = Math.floor(diffMinutes / 60);
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    }

    const timeOfDay = `${this.datePipe.transform(timestamp, 'h:mm')}${(this.datePipe.transform(timestamp, 'a') ?? '').toLowerCase()}`;

    if (this.isYesterday(entryDate, currentDate)) {
      return `Yesterday, ${timeOfDay}`;
    }

    const day = entryDate.getDate();
    return `${day}${this.getOrdinalSuffix(day)} ${this.datePipe.transform(timestamp, 'MMM, y')}. ${timeOfDay}`;
  }

  private isSameCalendarDay(firstDate: Date, secondDate: Date): boolean {
    return (
      firstDate.getFullYear() === secondDate.getFullYear() &&
      firstDate.getMonth() === secondDate.getMonth() &&
      firstDate.getDate() === secondDate.getDate()
    );
  }

  private isYesterday(entryDate: Date, currentDate: Date): boolean {
    const yesterday = new Date(currentDate);
    yesterday.setDate(currentDate.getDate() - 1);
    return this.isSameCalendarDay(entryDate, yesterday);
  }

  private getOrdinalSuffix(day: number): string {
    if (day >= 11 && day <= 13) {
      return 'th';
    }

    switch (day % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  }

  protected buttonClasses(button: CalculatorButtonConfig): Record<string, boolean> {
    const isOperatorStyled = button.type === CalculatorButtonType.OPERATOR;
    const isEquals = button.type === CalculatorButtonType.EQUALS;
    const isDigitStyled = button.type === CalculatorButtonType.DIGIT || button.type === CalculatorButtonType.DECIMAL;
    const isWide = button.columnSpan === 2 || button.columnSpan === 3;

    return {
      'col-span-2': button.columnSpan === 2,
      'col-span-3': button.columnSpan === 3,
      'bg-[#CBC18E]': isOperatorStyled,
      'hover:bg-[#D6CDA2]': isOperatorStyled,
      'bg-yellow-400': button.type === CalculatorButtonType.CLEAR,
      'hover:bg-yellow-300': button.type === CalculatorButtonType.CLEAR,
      'text-neutral-900': isOperatorStyled || button.type === CalculatorButtonType.CLEAR,
      'bg-emerald-500': isEquals,
      'hover:bg-emerald-400': isEquals,
      'bg-neutral-800': isDigitStyled,
      'hover:bg-neutral-700': isDigitStyled,
      'text-white': isDigitStyled || isEquals,
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

  private isOperatorToken(token: string): boolean {
    return CALCULATOR_OPERATORS.includes(token);
  }

  private evaluateTokens(tokens: readonly string[]): number {
    let result = Number(tokens[0]);

    for (let tokenIndex = 1; tokenIndex < tokens.length; tokenIndex += 2) {
      const operator = tokens[tokenIndex] as CalculatorOperator;
      const operand = Number(tokens[tokenIndex + 1]);
      result = this.applyOperator(result, operand, operator);
    }

    return result;
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
