import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InstallPromptModal } from './install-prompt-modal';

describe('InstallPromptModal', () => {
  let component: InstallPromptModal;
  let fixture: ComponentFixture<InstallPromptModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstallPromptModal],
    }).compileComponents();

    fixture = TestBed.createComponent(InstallPromptModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
