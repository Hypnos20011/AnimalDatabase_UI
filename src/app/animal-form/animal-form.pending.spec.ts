import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { AnimalForm } from './animal-form';
import { Animal } from '../animal-model/animal.model';
import { WikipediaImport } from '../animal-model/wikipedia-import.model';
import { AnimalService } from '../shared/animal.service';
import { LanguageService } from '../shared/i18n/language.service';
import { MissingTranslationCountService } from '../shared/missing-translation-count.service';

describe('AnimalForm pending submission', () => {
  const animal = {
    id: 1, commonName: 'Okapi', isDomesticated: false,
    lengthMmMin: null, lengthMmMax: null, heightMmMin: null, heightMmMax: null,
    weightGramsMin: null, weightGramsMax: null, lifespanMonthsMin: null, lifespanMonthsMax: null,
  } as Animal;
  const pending = { ...animal, status: 'pending' as const };
  const approved = { ...animal, status: 'approved' as const };
  const importData = {
    commonName: 'Okapi',
    scientificName: 'Okapia johnstoni',
    imageUrl: 'https://example.com/okapi.jpg',
    warnings: ['Warning'],
    lengthMmMin: null, lengthMmMax: null, heightMmMin: null, heightMmMax: null,
    weightGramsMin: null, weightGramsMax: null, lifespanMonthsMin: null, lifespanMonthsMax: null,
  } as WikipediaImport;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  afterEach(() => localStorage.clear());

  function setup(createResult: Observable<Animal> = of(pending), id?: string) {
    const service = {
      getAll: vi.fn(() => of([])),
      getById: vi.fn(() => of(approved)),
      getImages: vi.fn(() => of([])),
      create: vi.fn(() => createResult),
      update: vi.fn(() => of(pending)),
      importFromWikipedia: vi.fn(() => of(importData)),
    };
    const refresh = vi.fn();
    TestBed.configureTestingModule({
      imports: [AnimalForm],
      providers: [
        provideRouter([]),
        { provide: AnimalService, useValue: service },
        { provide: MissingTranslationCountService, useValue: { refresh } },
      ],
    });
    const i18n = TestBed.inject(LanguageService);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(AnimalForm);
    if (id) fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
    return { fixture, form: fixture.componentInstance, element: fixture.nativeElement as HTMLElement, service, refresh, navigate, i18n };
  }

  it('shows the pending confirmation without navigating', () => {
    const { fixture, form, element, navigate, refresh } = setup();
    form.form.controls.commonName.setValue('Okapi');
    form.submit();
    fixture.detectChanges();

    expect(navigate).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledOnce();
    expect(form.saving()).toBe(false);
    expect(element.querySelector('form')).toBeNull();
    expect(element.querySelector('.wiki-import')).toBeNull();
    expect(element.querySelector('.submitted h2')?.textContent).toBe('Thanks, your animal was submitted');
    expect(element.textContent).toContain('Okapi is waiting for admin approval. It will appear on the site once it is approved.');
    expect(element.querySelector('.submitted-icon')?.getAttribute('aria-hidden')).toBe('true');
    expect(element.querySelector('.submitted-actions .btn-primary')?.textContent).toContain('Add another animal');
    expect(element.querySelector('.submitted-actions a')?.textContent).toContain('Back to list');
    expect(element.querySelector('.submitted-actions a')?.getAttribute('href')).toBe('/');
  });

  it('starts another submission with default values and clears import and image state', () => {
    const { fixture, form, element, service } = setup();
    form.wikiUrl.set('Okapi');
    form.importFromWikipedia();
    form.form.controls.isDomesticated.setValue(true);
    form.form.controls.weightUnit.setValue('g');
    form.changeUnit('weight');
    form.form.controls.weightMin.setValue(20);
    form.form.markAllAsTouched();
    form.form.markAsDirty();
    form.addImageRow();
    form.imageRows.at(1).get('url')?.setValue('https://example.com/second.jpg');
    form.markPreviewFailed('https://example.com/okapi.jpg');
    form.error.set('old error');
    form.importError.set('old import error');
    form.submit();
    fixture.detectChanges();
    (element.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(element.querySelector('form')).not.toBeNull();
    expect(form.form.controls.commonName.value).toBe('');
    expect(form.form.controls.scientificName.value).toBe('');
    expect(form.form.controls.weightMin.value).toBeNull();
    expect(form.form.controls.weightUnit.value).toBe('kg');
    expect(form.form.controls.isDomesticated.value).toBe(false);
    expect(form.form.controls.iucnStatus.enabled).toBe(true);
    expect(form.form.pristine).toBe(true);
    expect(form.form.untouched).toBe(true);
    expect(form.imageRows.length).toBe(1);
    expect(form.imageRows.at(0).value).toEqual({ url: '', attribution: '', sourcePageUrl: '' });
    expect(form.wikiUrl()).toBe('');
    expect(form.importMessage()).toBe('');
    expect(form.importError()).toBe('');
    expect(form.importWarnings()).toEqual([]);
    expect(form.error()).toBe('');
    expect(form.previewFailed('https://example.com/okapi.jpg')).toBe(false);

    form.form.controls.scientificName.setValue('Okapia johnstoni');
    service.importFromWikipedia.mockReturnValueOnce(of({
      ...importData,
      commonName: null,
      scientificName: null,
      imageUrl: null,
      warnings: [],
    }));
    form.wikiUrl.set('Second');
    form.importFromWikipedia();
    expect(form.form.controls.scientificName.value).toBe('Okapia johnstoni');
    form.form.controls.commonName.setValue('Second');
    form.form.controls.weightMin.setValue(0.002);
    form.form.controls.weightUnit.setValue('g');
    form.changeUnit('weight');
    expect(form.form.controls.weightMin.value).toBe(2);
    form.submit();
    fixture.detectChanges();
    expect(service.create).toHaveBeenLastCalledWith(expect.objectContaining({ commonName: 'Second', images: [] }));
    expect(service.create).toHaveBeenLastCalledWith(expect.objectContaining({ weightGramsMin: 2 }));
    expect(element.textContent).toContain('Thanks, your animal was submitted');
  });

  it('ignores a Wikipedia lookup still in flight when starting another submission', () => {
    const { fixture, form, element, service } = setup();
    const lookup = new Subject<WikipediaImport>();
    service.importFromWikipedia.mockReturnValue(lookup);
    form.wikiUrl.set('Okapi');
    form.importFromWikipedia();
    form.form.controls.commonName.setValue('Okapi');
    form.submit();
    fixture.detectChanges();
    (element.querySelector('button') as HTMLButtonElement).click();
    lookup.next(importData);
    fixture.detectChanges();

    expect(form.form.controls.commonName.value).toBe('');
    expect(form.imageRows.at(0).get('url')?.value).toBe('');
    expect(form.importing()).toBe(false);
    expect(form.importMessage()).toBe('');
  });

  it('preserves admin create navigation and count refresh', () => {
    const { form, navigate, refresh } = setup(of(approved));
    form.form.controls.commonName.setValue('Okapi');
    form.submit();
    expect(refresh).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('preserves edit navigation even if the response is pending', () => {
    const { form, service, navigate, refresh } = setup(of(pending), '1');
    form.submit();
    expect(service.update).toHaveBeenCalledOnce();
    expect(refresh).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/animals', '1']);
  });

  it('uses the localized access denied message for a 403 instead of the server body', () => {
    const { fixture, form, element, navigate, i18n } = setup(throwError(() => new HttpErrorResponse({ status: 403, error: 'Server message' })));
    i18n.setLanguage('de');
    form.form.controls.commonName.setValue('Okapi');
    form.submit();
    fixture.detectChanges();
    expect(form.error()).toBe(i18n.t('admin.accessDenied'));
    expect(element.querySelector('.field-error')?.textContent?.trim()).toBe(i18n.t('admin.accessDenied'));
    expect(form.saving()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('uses the access denied message when an edit is forbidden', () => {
    const { form, service, navigate, i18n } = setup(of(pending), '1');
    service.update.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 403 })));
    form.submit();
    expect(form.error()).toBe(i18n.t('admin.accessDenied'));
    expect(form.saving()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('preserves other server errors', () => {
    const { form, navigate } = setup(throwError(() => new HttpErrorResponse({ status: 400, error: 'Bad request' })));
    form.form.controls.commonName.setValue('Okapi');
    form.submit();
    expect(form.error()).toBe('Bad request');
    expect(form.saving()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
});
