import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { AnimalForm } from './animal-form';
import { AnimalService } from '../shared/animal.service';
import { LanguageService } from '../shared/i18n/language.service';
import { WikipediaImport } from '../animal-model/wikipedia-import.model';

function okapi(overrides: Partial<WikipediaImport> = {}): WikipediaImport {
  return {
    commonName: 'Okapi',
    scientificName: 'Okapia johnstoni',
    family: null,
    taxonomicClass: null,
    lengthMmMin: null,
    lengthMmMax: null,
    heightMmMin: null,
    heightMmMax: null,
    weightGramsMin: null,
    weightGramsMax: null,
    lifespanMonthsMin: null,
    lifespanMonthsMax: null,
    iucnStatus: null,
    habitat: null,
    rangeRegion: null,
    profile: null,
    imageUrl: null,
    attribution: null,
    sourcePageUrl: null,
    sourceUrl: null,
    warnings: [],
    ...overrides,
  } as WikipediaImport;
}

describe('AnimalForm i18n', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  afterEach(() => localStorage.clear());

  function setup(language: 'en' | 'de' | 'fr', overrides: Record<string, unknown> = {}) {
    localStorage.setItem('language', language);
    const service = {
      getAll: vi.fn(() => of([])),
      create: vi.fn((): Observable<unknown> => of({ id: 5 })),
      importFromWikipedia: vi.fn(() => of(okapi())),
      ...overrides,
    };
    TestBed.configureTestingModule({
      imports: [AnimalForm],
      providers: [provideRouter([]), { provide: AnimalService, useValue: service }],
    });
    const fixture = TestBed.createComponent(AnimalForm);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    return { fixture, form: fixture.componentInstance, element, service };
  }

  it('shows the English labels by default', () => {
    const { element } = setup('en');
    expect(element.querySelector('h2')?.textContent).toBe('Add animal');
    expect(element.textContent).toContain('Scientific name');
    expect(element.querySelector('legend')?.textContent).toBe('Pictures');
    expect(element.querySelector('.preview-hint')?.textContent?.trim()).toBe(
      'No picture yet. If Wikipedia has none, paste an image URL from Wikimedia Commons.',
    );
    expect(element.querySelector('button[type=submit]')?.textContent?.trim()).toBe('Save');
  });

  it('shows German labels, buttons and placeholders', () => {
    const { element } = setup('de');
    expect(element.querySelector('h2')?.textContent).toBe('Tier hinzufügen');
    expect(element.textContent).toContain('Wissenschaftlicher Name');
    expect(element.textContent).toContain('Lifespan');
    expect(element.textContent).toContain('Bildnachweis');
    expect(element.querySelector('.preview-hint')?.textContent?.trim()).toBe(
      'Noch kein Bild. Wenn Wikipedia keines hat, füge eine Bild-URL von Wikimedia Commons ein.',
    );
    expect(element.querySelector('legend')?.textContent).toBe('Bilder');
    expect(element.querySelector('button[type=submit]')?.textContent?.trim()).toBe('Speichern');
    expect(element.querySelector('a.btn-secondary')?.textContent).toBe('Abbrechen');
    const wikiInput = element.querySelector('.wiki-import input') as HTMLInputElement;
    expect(wikiInput.placeholder).toBe('Tiername, z. B. Schuhschnabel');
  });

  it('shows the empty image preview hint in French', () => {
    const { element } = setup('fr');

    expect(element.querySelector('.preview-hint')?.textContent?.trim()).toBe(
      'Pas encore d’image. Si Wikipédia n’en a pas, colle une URL d’image de Wikimedia Commons.',
    );
  });

  it('translates class, IUCN and habitat options but keeps their values', () => {
    const { element } = setup('de');
    const option = (control: string, value: string) =>
      element.querySelector(
        `select[formControlName=${control}] option[value="${value}"]`,
      ) as HTMLOptionElement;
    expect(option('taxonomicClass', 'mammal').textContent).toBe('Säugetier');
    expect(option('iucnStatus', 'least concern').textContent).toBe('Nicht gefährdet');
    expect(option('habitatType', 'deep sea').textContent).toBe('Tiefsee');
    expect(option('habitatType', '').textContent).toBe('Unbekannt');
  });

  it('shows general validation errors in German and measurement errors in English', () => {
    const { fixture, form, element } = setup('de');
    form.form.controls.commonName.setValue('');
    form.form.patchValue({ weightMin: 10, weightMax: 5, lifespanMax: 2.5 });
    form.submit();
    fixture.detectChanges();
    const text = element.textContent ?? '';
    expect(text).toContain('Der Name ist ein Pflichtfeld.');
    expect(text).toContain('Enter a valid range; the minimum must not exceed the maximum.');
    expect(form.form.controls.lifespanMax.valid).toBe(true);
  });

  it('switches labels right after the language changes', () => {
    const { fixture, element } = setup('en');
    TestBed.inject(LanguageService).setLanguage('de');
    fixture.detectChanges();
    expect(element.querySelector('h2')?.textContent).toBe('Tier hinzufügen');
  });

  it('reports a Wikipedia fill in German with plural counts', () => {
    const { form } = setup('de');
    form.wikiUrl.set('Okapi');
    form.importFromWikipedia();
    expect(form.importMessage()).toBe(
      '2 Felder aus Wikipedia ausgefüllt. Bitte vor dem Speichern prüfen.',
    );
  });

  it('uses the singular for one filled field', () => {
    const { form } = setup('en', {
      importFromWikipedia: vi.fn(() => of(okapi({ scientificName: null }))),
    });
    form.wikiUrl.set('Okapi');
    form.importFromWikipedia();
    expect(form.importMessage()).toBe('Filled in 1 field from Wikipedia. Check it before saving.');
  });

  it('localizes the rate limit message', () => {
    const { form } = setup('de', {
      importFromWikipedia: vi.fn(() =>
        throwError(
          () =>
            new HttpErrorResponse({
              status: 429,
              headers: new HttpHeaders({ 'Retry-After': '20' }),
            }),
        ),
      ),
    });
    form.wikiUrl.set('Okapi');
    form.importFromWikipedia();
    expect(form.importError()).toBe(
      'Zu viele Abfragen. Bitte in 20 Sekunden noch einmal versuchen.',
    );
  });

  it('does not render manual translation fields or a translate action', () => {
    const { element } = setup('de');

    expect(element.querySelector('[formControlName="commonNameDe"]')).toBeNull();
    expect(element.querySelector('[formControlName="commonNameFr"]')).toBeNull();
    expect(element.textContent).not.toContain('Ins Deutsche und Französische übersetzen');
  });

  it('localizes the save fallback error', () => {
    const { form } = setup('de', {
      create: vi.fn(() => throwError(() => new HttpErrorResponse({ status: 500 }))),
    });
    form.form.controls.commonName.setValue('Okapi');
    form.submit();
    expect(form.error()).toBe('Das Tier konnte nicht gespeichert werden');
  });

  it('saves an unspecified image without a generated caption in German', () => {
    const { form, service } = setup('de');
    form.form.controls.commonName.setValue('Okapi');
    form.imageRows.at(0).get('url')?.setValue('https://upload.wikimedia.org/okapi.jpg');
    form.submit();
    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({
        images: [expect.objectContaining({ kind: 'unspecified', caption: null })],
      }),
    );
  });
});
