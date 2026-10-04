import { TestBed } from '@angular/core/testing';
import { InstallPrompt } from './install-prompt';

describe('InstallPrompt', () => {
  let service: InstallPrompt;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InstallPrompt);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
