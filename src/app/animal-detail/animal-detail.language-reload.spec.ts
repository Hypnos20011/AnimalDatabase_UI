import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { AnimalDetail } from './animal-detail';
import { AnimalService } from '../shared/animal.service';
import { Animal } from '../animal-model/animal.model';
import { AdminKeyService } from '../admin/admin-key.service';
import { LanguageService } from '../shared/i18n/language.service';

function axolotl(id: number, language?: string): Animal {
  const de = language === 'de';
  return {
    id,
    commonName: de ? 'Mexikanischer Querzahnmolch' : 'Axolotl',
    scientificName: 'Ambystoma mexicanum',
    family: 'Ambystomatidae',
    taxonomicClass: 'amphibian',
    isDomesticated: false,
    lengthMmMin: null,
    lengthMmMax: null,
    heightMmMin: null,
    heightMmMax: null,
    weightGramsMin: null,
    weightGramsMax: null,
    lifespanMonthsMin: null,
    lifespanMonthsMax: null,
    iucnStatus: 'critically endangered',
    habitat: de ? 'Seen und Kan\u00e4le' : 'Lakes and canals',
    habitatType: 'freshwater',
    rangeRegion: 'Mexico',
    profile: de ? 'Ein Schwanzlurch. Fun fact: Er bleibt sein Leben lang Larve.' : 'A salamander. Fun fact: It stays a larva for life.',
    thumbnailUrl: null,
    createdAt: '2026-10-08T10:00:00',
    updatedAt: '2026-10-08T10:00:00',
  } as unknown as Animal;
}

describe('AnimalDetail language reload', () => {
  let getById: ReturnType<typeof vi.fn>;
  let getImages: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    getById = vi.fn((id: number, language?: string) => of(axolotl(id, language)));
    getImages = vi.fn(() => of([]));
  });

  afterEach(() => localStorage.clear());

  async function render(initialKey: string | null = null) {
    const key = signal(initialKey);
    TestBed.configureTestingModule({
      imports: [AnimalDetail],
      providers: [
        provideRouter([]),
        { provide: AnimalService, useValue: { getById, getImages, delete: vi.fn(() => of(undefined)) } },
        { provide: AdminKeyService, useValue: { key, unlocked: signal(false), role: signal('none') } },
      ],
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(AnimalDetail);
    fixture.componentRef.setInput('id', '3');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const settle = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    return { fixture, settle, detail: fixture.componentInstance, key, navigate, element: fixture.nativeElement as HTMLElement };
  }

  it('loads the animal in the current language', async () => {
    localStorage.setItem('language', 'de');
    const { detail } = await render();
    expect(getById).toHaveBeenCalledWith(3, 'de');
    expect(detail.animal()?.commonName).toBe('Mexikanischer Querzahnmolch');
  });

  it('reloads the texts when the language is switched', async () => {
    const { detail, settle } = await render();
    expect(getById).toHaveBeenLastCalledWith(3, 'en');
    TestBed.inject(LanguageService).setLanguage('de');
    await settle();
    expect(getById).toHaveBeenCalledTimes(2);
    expect(getById).toHaveBeenLastCalledWith(3, 'de');
    expect(detail.animal()?.commonName).toBe('Mexikanischer Querzahnmolch');
    expect(detail.profileText()).toBe('Ein Schwanzlurch.');
    expect(detail.funFact()).toBe('Er bleibt sein Leben lang Larve.');
  });

  it('keeps the details open and does not show loading on a language switch', async () => {
    const { detail, settle } = await render();
    detail.showDetails.set(true);
    const loadingStates: boolean[] = [];
    const animals: (Animal | null)[] = [];
    getById.mockImplementationOnce((id: number, language?: string) => {
      loadingStates.push(detail.loading());
      animals.push(detail.animal());
      return of(axolotl(id, language));
    });
    TestBed.inject(LanguageService).setLanguage('de');
    await settle();
    expect(loadingStates).toEqual([false]);
    expect(animals[0]?.commonName).toBe('Axolotl');
    expect(detail.showDetails()).toBe(true);
  });

  it('does not reload the images on a language switch', async () => {
    const { settle } = await render();
    expect(getImages).toHaveBeenCalledTimes(1);
    TestBed.inject(LanguageService).setLanguage('de');
    await settle();
    expect(getImages).toHaveBeenCalledTimes(1);
  });

  it('still resets the page and loads images when another animal is opened', async () => {
    const { fixture, detail, settle } = await render();
    detail.showDetails.set(true);
    fixture.componentRef.setInput('id', '4');
    await settle();
    expect(getById).toHaveBeenLastCalledWith(4, 'en');
    expect(getImages).toHaveBeenCalledTimes(2);
    expect(getImages).toHaveBeenLastCalledWith(4);
    expect(detail.showDetails()).toBe(false);
  });

  it('updates the page title on a language switch', async () => {
    const { settle } = await render();
    TestBed.inject(LanguageService).setLanguage('de');
    await settle();
    expect(document.title).toContain('Mexikanischer Querzahnmolch');
  });

  it('shows not found for a direct missing id without redirecting', async () => {
    const { fixture, settle, navigate, element } = await render();
    expect(document.title).toBe('Axolotl · Unusual Animals');

    getById.mockImplementationOnce(() => throwError(() => new HttpErrorResponse({ status: 404 })));
    fixture.componentRef.setInput('id', '404');
    await settle();

    expect(document.title).toBe('Unusual Animals');
    expect(document.title).not.toContain('Axolotl');
    expect(element.textContent).toContain('Animal not found.');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('redirects to the list when locking makes the same pending animal return 404', async () => {
    const { settle, key, navigate } = await render('tester-key');
    getById.mockImplementationOnce(() => throwError(() => new HttpErrorResponse({ status: 404 })));

    key.set(null);
    await settle();

    expect(navigate).toHaveBeenCalledWith(['/'], { replaceUrl: true });
  });

  it('stays on an approved animal after locking', async () => {
    const { settle, key, navigate, detail } = await render('admin-key');

    key.set(null);
    await settle();

    expect(detail.animal()?.commonName).toBe('Axolotl');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not redirect when a language change returns 404', async () => {
    const { settle, navigate, detail } = await render();
    getById.mockImplementationOnce(() => throwError(() => new HttpErrorResponse({ status: 404 })));

    TestBed.inject(LanguageService).setLanguage('de');
    await settle();

    expect(detail.animal()).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });
});
