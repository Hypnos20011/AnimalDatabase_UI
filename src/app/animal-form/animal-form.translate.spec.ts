import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AnimalForm } from './animal-form';
import { AnimalService } from '../shared/animal.service';
import { Animal, AnimalTexts } from '../animal-model/animal.model';
import { it } from 'vitest';

const englishAnimal: Animal = {
  id: 11,
  commonName: 'Axolotl',
  scientificName: 'Ambystoma mexicanum',
  family: null,
  taxonomicClass: 'amphibian',
  isDomesticated: false,
  sizeLengthCmMin: null,
  sizeLengthCmMax: null,
  sizeHeightCmMin: null,
  sizeHeightCmMax: null,
  weightKgMin: null,
  weightKgMax: null,
  lifespanYearsMin: null,
  lifespanYearsMax: null,
  iucnStatus: null,
  habitat: 'Lakes',
  habitatType: 'freshwater',
  rangeRegion: 'Mexico',
  profile: 'A salamander. Fun fact: It keeps its gills.',
  thumbnailUrl: null,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  sourceUrl: null,
};

const german: AnimalTexts = {
  commonName: 'Axolotl',
  habitat: 'Seen',
  rangeRegion: 'Mexiko',
  profile: 'Ein Salamander. Fun fact: Er behält seine Kiemen.',
};

const french: AnimalTexts = {
  commonName: 'Axolotl',
  habitat: 'Lacs',
  rangeRegion: 'Mexique',
  profile: 'Une salamandre. fun fact: Il garde ses branchies.',
};

function translated(language: string) {
  return of(language === 'fr' ? french : german);
}

function editingSetup(getTranslation: ReturnType<typeof vi.fn>) {
  const service = {
    getAll: vi.fn(() => of([])),
    getById: vi.fn(() => of(englishAnimal)),
    getImages: vi.fn(() => of([])),
    getTranslation,
    translate: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    saveTranslation: vi.fn(),
    importFromWikipedia: vi.fn(),
  };
  TestBed.configureTestingModule({
    imports: [AnimalForm],
    providers: [provideRouter([]), { provide: AnimalService, useValue: service }],
  });
  const fixture = TestBed.createComponent(AnimalForm);
  fixture.componentRef.setInput('id', '11');
  fixture.detectChanges();
  return { fixture, service };
}

describe('AnimalForm German translation', () => {
  function setup(overrides: Record<string, unknown> = {}) {
    const service = {
      getAll: vi.fn(() => of([])),
      getById: vi.fn(() => of(englishAnimal)),
      getImages: vi.fn(() => of([])),
      getTranslation: vi.fn(() => of(german)),
      translate: vi.fn((_texts: AnimalTexts, language: string) => translated(language)),
      create: vi.fn(() => of(englishAnimal)),
      update: vi.fn(() => of(englishAnimal)),
      saveTranslation: vi.fn(() => of(undefined)),
      importFromWikipedia: vi.fn(() => of({})),
      ...overrides,
    };
    TestBed.configureTestingModule({
      imports: [AnimalForm],
      providers: [provideRouter([]), { provide: AnimalService, useValue: service }],
    });
    const fixture = TestBed.createComponent(AnimalForm);
    fixture.detectChanges();
    return { form: fixture.componentInstance, service };
  }

  it('fills the German and French fields from one call per language', () => {
    const { form, service } = setup();
    form.form.controls.commonName.setValue('Axolotl');
    form.form.controls.habitat.setValue('Lakes');
    form.form.controls.profile.setValue('A salamander. Fun fact: It keeps its gills.');
    form.translateTexts();
    expect(service.translate).toHaveBeenCalledWith(
      expect.objectContaining({ commonName: 'Axolotl' }),
      'de',
    );
    expect(service.translate).toHaveBeenCalledWith(
      expect.objectContaining({ commonName: 'Axolotl' }),
      'fr',
    );
    expect(form.form.controls.commonNameDe.value).toBe('Axolotl');
    expect(form.form.controls.habitatDe.value).toBe('Seen');
    expect(form.form.controls.rangeRegionDe.value).toBe('Mexiko');
    expect(form.form.controls.profileDe.value).toContain('Fun fact:');
    expect(form.form.controls.habitatFr.value).toBe('Lacs');
    expect(form.form.controls.rangeRegionFr.value).toBe('Mexique');
    expect(form.form.controls.profileFr.value).toContain('Fun fact:');
    expect(form.form.controls.profileFr.value).not.toContain('fun fact:');
    expect(form.translateMessage()).toContain('German and French fields filled in');
    expect(form.translating()).toBe(false);
  });

  it('keeps a successful language when the other request fails', () => {
    const { form } = setup({
      translate: vi.fn((_texts: AnimalTexts, language: string) =>
        language === 'fr'
          ? throwError(
              () =>
                new HttpErrorResponse({
                  status: 502,
                  error: 'Could not reach the translation service',
                }),
            )
          : translated(language),
      ),
    });
    form.form.controls.commonName.setValue('Axolotl');
    form.translateTexts();
    expect(form.form.controls.habitatDe.value).toBe('Seen');
    expect(form.form.controls.habitatFr.value).toBe('');
    expect(form.translateMessage()).toContain('German fields filled in');
    expect(form.translateError()).toBe('Could not reach the translation service');
    expect(form.translating()).toBe(false);
  });

  it('shows the API error text when both languages fail', () => {
    const { form } = setup({
      translate: vi.fn(() =>
        throwError(
          () => new HttpErrorResponse({ status: 503, error: 'The character credit is used up' }),
        ),
      ),
    });
    form.form.controls.commonName.setValue('Axolotl');
    form.translateTexts();
    expect(form.translateError()).toBe('The character credit is used up');
    expect(form.translateMessage()).toBe('');
    expect(form.translating()).toBe(false);
  });

  it('loads saved German and French texts when editing', async () => {
    const { fixture, service } = editingSetup(
      vi.fn((_id: number, language: string) => translated(language)),
    );
    await fixture.whenStable();
    expect(service.getTranslation).toHaveBeenCalledWith(11, 'de');
    expect(service.getTranslation).toHaveBeenCalledWith(11, 'fr');
    expect(fixture.componentInstance.form.controls.commonNameDe.value).toBe('Axolotl');
    expect(fixture.componentInstance.form.controls.habitatDe.value).toBe('Seen');
    expect(fixture.componentInstance.form.controls.habitatFr.value).toBe('Lacs');
    expect(fixture.componentInstance.form.controls.commonName.value).toBe('Axolotl');
  });

  it('treats a missing translation as empty German and French fields', async () => {
    const { fixture } = editingSetup(
      vi.fn(() => throwError(() => new HttpErrorResponse({ status: 404 }))),
    );
    await fixture.whenStable();
    expect(fixture.componentInstance.error()).toBe('');
    expect(fixture.componentInstance.form.controls.commonNameDe.value).toBe('');
    expect(fixture.componentInstance.form.controls.habitatDe.value).toBe('');
    expect(fixture.componentInstance.form.controls.commonNameFr.value).toBe('');
    expect(fixture.componentInstance.form.controls.habitatFr.value).toBe('');
  });

  it('saves the German texts after creating an animal', () => {
    const { form, service } = setup();
    form.form.controls.commonName.setValue('Axolotl');
    form.form.controls.commonNameDe.setValue('Axolotl');
    form.form.controls.habitatDe.setValue('Seen');
    form.submit();
    expect(service.create).toHaveBeenCalled();
    expect(service.saveTranslation).toHaveBeenCalledWith(
      11,
      'de',
      expect.objectContaining({ commonName: 'Axolotl', habitat: 'Seen' }),
    );
  });

  it('saves French texts as well as German texts', () => {
    const { form, service } = setup();
    form.form.controls.commonName.setValue('Axolotl');
    form.form.controls.habitatDe.setValue('Seen');
    form.form.controls.habitatFr.setValue('Lacs');
    form.submit();
    expect(service.saveTranslation).toHaveBeenCalledWith(
      11,
      'de',
      expect.objectContaining({ habitat: 'Seen' }),
    );
    expect(service.saveTranslation).toHaveBeenCalledWith(
      11,
      'fr',
      expect.objectContaining({ habitat: 'Lacs' }),
    );
  });

  it('skips saveTranslation when every German field is empty', () => {
    const { form, service } = setup();
    form.form.controls.commonName.setValue('Axolotl');
    form.submit();
    expect(service.create).toHaveBeenCalled();
    expect(service.saveTranslation).not.toHaveBeenCalled();
  });
});
