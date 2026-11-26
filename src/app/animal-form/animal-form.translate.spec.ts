import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AnimalForm } from './animal-form';
import { AnimalService } from '../shared/animal.service';
import { MissingTranslationCountService } from '../shared/missing-translation-count.service';

describe('AnimalForm translations', () => {
  function setup() {
    const service = {
      getAll: vi.fn(() => of([])),
      create: vi.fn(() => of({ id: 11 })),
      update: vi.fn(() => of({ id: 11 })),
      getById: vi.fn(),
      getImages: vi.fn(),
      getTranslation: vi.fn(),
      saveTranslation: vi.fn(),
      importFromWikipedia: vi.fn(),
    };
    TestBed.configureTestingModule({
      imports: [AnimalForm],
      providers: [provideRouter([]), { provide: AnimalService, useValue: service }],
    });
    const fixture = TestBed.createComponent(AnimalForm);
    fixture.detectChanges();
    return { fixture, form: fixture.componentInstance, service };
  }

  it('does not render manual German or French text controls or a translate button', () => {
    const { fixture, form } = setup();
    const element = fixture.nativeElement as HTMLElement;

    expect(Object.keys(form.form.controls)).not.toContain('commonNameDe');
    expect(Object.keys(form.form.controls)).not.toContain('commonNameFr');
    expect(element.querySelector('[formControlName="commonNameDe"]')).toBeNull();
    expect(element.querySelector('[formControlName="commonNameFr"]')).toBeNull();
    expect(element.querySelector('.translation-actions')).toBeNull();
    expect(element.querySelector('.translation-texts')).toBeNull();
  });

  it('saves the animal without calling translation endpoints', () => {
    const { form, service } = setup();
    const refresh = vi.spyOn(TestBed.inject(MissingTranslationCountService), 'refresh');
    form.form.controls.commonName.setValue('Axolotl');

    form.submit();

    expect(service.create).toHaveBeenCalledOnce();
    expect(service.getTranslation).not.toHaveBeenCalled();
    expect(service.saveTranslation).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledOnce();
  });
});
