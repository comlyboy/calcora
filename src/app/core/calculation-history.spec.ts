import { TestBed } from '@angular/core/testing';
import { CalculationHistory } from './calculation-history';

describe('CalculationHistory', () => {
  let service: CalculationHistory;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CalculationHistory);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
