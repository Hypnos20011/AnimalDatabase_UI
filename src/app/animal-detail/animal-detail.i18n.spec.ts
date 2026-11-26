import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import { AnimalDetail } from './animal-detail';
import { AnimalService } from '../shared/animal.service';
import { Animal } from '../animal-model/animal.model';
import { AnimalImage } from '../animal-model/animal-image.model';
import { AdminKeyService } from '../admin/admin-key.service';
import { LanguageService } from '../shared/i18n/language.service';

const okapi = {
  id: 2,
  commonName: 'Okapi',
  scientificName: 'Okapia johnstoni',
  family: 'Giraffidae',
  taxonomicClass: 'mammal',
  isDomesticated: false,
  sizeLengthCmMin: 180,
  sizeLengthCmMax: 250,
  sizeHeightCmMin: 140,
  sizeHeightCmMax: 170,
  weightKgMin: 200,
  weightKgMax: 350,
  lifespanYearsMin: 20,
  lifespanYearsMax: 30,
  iucnStatus: 'endangered',
  habitat: 'Dense rainforest',
  habitatType: 'forest',
  rangeRegion: 'Congo',
  profile: 'A shy forest giraffe. Fun fact: It cleans its ears with its tongue.',
  thumbnailUrl: null,
  createdAt: '2026-10-08T10:00:00',
  updatedAt: '2026-10-08T10:00:00',
} as Animal;

const pictures = [
  {
    id: 1,
    animalId: 2,
    url: 'https://example.org/a.jpg',
    caption: null,
    attribution: 'Foto: Beispiel',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Example.jpg',
  },
  { id: 2, animalId: 2, url: 'https://example.org/b.jpg', caption: null, attribution: null, sourcePageUrl: null },
] as unknown as AnimalImage[];

describe('AnimalDetail translation', () => {
  beforeAll(() => {
    registerLocaleData(localeDe);
  });

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = '';
  });

  afterEach(() => {
    localStorage.clear();
  });

  async function render(
    options: { animal?: Animal; images?: AnimalImage[]; fail?: boolean } = {},
  ) {
    const service = {
      getById: vi.fn(() =>
        options.fail ? throwError(() => new Error('not found')) : of(options.animal ?? okapi),
      ),
      getImages: vi.fn(() => of(options.images ?? [])),
      delete: vi.fn(() => of(undefined)),
    };
    TestBed.configureTestingModule({
      imports: [AnimalDetail],
      providers: [
        provideRouter([]),
        { provide: AnimalService, useValue: service },
        { provide: AdminKeyService, useValue: { unlocked: signal(false), role: signal('none') } },
      ],
    });
    const fixture = TestBed.createComponent(AnimalDetail);
    fixture.componentRef.setInput('id', '2');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const text = (selector: string) => element.querySelector(selector)?.textContent?.trim() ?? '';
    const labels = () => Array.from(element.querySelectorAll('dt')).map((dt) => dt.textContent!.trim());
    const openDetails = () => {
      element.querySelector<HTMLButtonElement>('.more')!.click();
      fixture.detectChanges();
    };
    return { fixture, element, text, labels, openDetails };
  }

  it('shows the English labels by default', async () => {
    const { labels, text } = await render();
    expect(labels()).toEqual(['IUCN status', 'Weight', 'Lifespan', 'Habitat type', 'Habitat', 'Range']);
    expect(text('.more')).toBe('More details');
    expect(text('.back')).toBe('Back to list');
  });

  it('shows the German labels when German is stored', async () => {
    localStorage.setItem('language', 'de');
    const { labels, text } = await render();
    expect(labels()).toEqual(['IUCN-Status', 'Gewicht', 'Lebensdauer', 'Lebensraumtyp', 'Lebensraum', 'Verbreitung']);
    expect(text('.more')).toBe('Mehr Details');
    expect(text('.back')).toBe('Zur\u00fcck zur Liste');
  });

  it('translates the extra details', async () => {
    localStorage.setItem('language', 'de');
    const { labels, text, element, openDetails } = await render({
      animal: { ...okapi, updatedAt: '2026-10-20T10:00:00' } as Animal,
    });
    openDetails();
    expect(text('.more')).toBe('Weniger Details');
    expect(labels()).toEqual(
      expect.arrayContaining([
        'Familie',
        'Klasse',
        'Typ',
        'K\u00f6rperl\u00e4nge',
        'Schulterh\u00f6he',
        'Zuletzt aktualisiert',
      ]),
    );
    const values = Array.from(element.querySelectorAll('.extra dd')).map((dd) => dd.textContent!.trim());
    expect(values).toContain('Wildtier');
  });

  it('translates the domesticated type', async () => {
    localStorage.setItem('language', 'de');
    const { element, openDetails } = await render({ animal: { ...okapi, isDomesticated: true } as Animal });
    openDetails();
    const values = Array.from(element.querySelectorAll('.extra dd')).map((dd) => dd.textContent!.trim());
    expect(values).toContain('Haustier');
  });

  it('translates the unknown lifespan', async () => {
    localStorage.setItem('language', 'de');
    const { element } = await render({
      animal: { ...okapi, lifespanYearsMin: null, lifespanYearsMax: null } as unknown as Animal,
    });
    const values = Array.from(element.querySelectorAll('.facts dd')).map((dd) => dd.textContent!.trim());
    expect(values).toContain('Unbekannt');
  });

  it('translates the fun fact, profile and gallery labels', async () => {
    localStorage.setItem('language', 'de');
    const { text, element } = await render({ images: pictures });
    expect(text('.fun-fact-label')).toBe('Wusstest du?');
    expect(text('.profile h3')).toBe('Steckbrief');
    expect(element.querySelector('.gallery')!.getAttribute('aria-label')).toBe('Weitere Bilder');
    expect(element.querySelector('.image-credit')?.textContent).toContain('Bildnachweis');
  });

  it('translates the no images text', async () => {
    localStorage.setItem('language', 'de');
    const { text } = await render();
    expect(text('.no-images')).toBe('Noch keine Bilder hochgeladen.');
  });

  it('translates the not found state', async () => {
    localStorage.setItem('language', 'de');
    const { text } = await render({ fail: true });
    expect(text('.state-message')).toBe('Tier nicht gefunden.');
    expect(text('.back')).toBe('Zur\u00fcck zur Liste');
  });

  it('updates the labels when the language is switched', async () => {
    const { fixture, labels, text } = await render();
    expect(labels()[1]).toBe('Weight');
    TestBed.inject(LanguageService).setLanguage('de');
    fixture.detectChanges();
    expect(labels()[1]).toBe('Gewicht');
    expect(text('.more')).toBe('Mehr Details');
  });

  it('translates the status, habitat type and class values', async () => {
    localStorage.setItem('language', 'de');
    const { element, text, openDetails } = await render();
    expect(text('.status')).toBe('Stark gef\u00e4hrdet');
    expect(element.querySelector('.status')!.getAttribute('data-status')).toBe('endangered');
    expect(text('.habitat-type')).toBe('Wald');
    openDetails();
    const values = Array.from(element.querySelectorAll('.extra dd')).map((dd) => dd.textContent!.trim());
    expect(values).toContain('S\u00e4ugetier');
  });

  it('shows the English values by default', async () => {
    const { text, element, openDetails } = await render();
    expect(text('.status')).toBe('Endangered');
    expect(text('.habitat-type')).toBe('Forest');
    openDetails();
    const values = Array.from(element.querySelectorAll('.extra dd')).map((dd) => dd.textContent!.trim());
    expect(values).toContain('Mammal');
  });

  it('formats the last updated date in the chosen language', async () => {
    const updated = { ...okapi, updatedAt: '2026-10-20T10:00:00' } as Animal;
    const { fixture, element, openDetails } = await render({ animal: updated });
    openDetails();
    const date = () => element.querySelector('.extra .fact:last-child dd')!.textContent!.trim();
    expect(date()).toBe('October 20, 2026');
    TestBed.inject(LanguageService).setLanguage('de');
    fixture.detectChanges();
    expect(date()).toBe('20. Oktober 2026');
  });

  it('translates the weight and lifespan ranges', async () => {
    localStorage.setItem('language', 'de');
    const { element } = await render({
      animal: { ...okapi, weightKgMin: null, weightKgMax: 0.5, lifespanYearsMin: null, lifespanYearsMax: 30 } as unknown as Animal,
    });
    const values = Array.from(element.querySelectorAll('.facts dd')).map((dd) => dd.textContent!.trim());
    expect(values).toContain('bis zu 0,5 kg');
    expect(values).toContain('bis zu 30 Jahre');
  });

  it('uses the singular year and at least in German', async () => {
    localStorage.setItem('language', 'de');
    const { element } = await render({
      animal: { ...okapi, weightKgMin: 2, weightKgMax: null, lifespanYearsMin: 1, lifespanYearsMax: 1 } as unknown as Animal,
    });
    const values = Array.from(element.querySelectorAll('.facts dd')).map((dd) => dd.textContent!.trim());
    expect(values).toContain('mindestens 2 kg');
    expect(values).toContain('1 Jahr');
  });

  it('uses German decimals in the size ranges', async () => {
    localStorage.setItem('language', 'de');
    const { element, openDetails } = await render({
      animal: { ...okapi, sizeLengthCmMin: 0.5, sizeLengthCmMax: 1.5 } as Animal,
    });
    openDetails();
    const values = Array.from(element.querySelectorAll('.extra dd')).map((dd) => dd.textContent!.trim());
    expect(values).toContain('0,5\u20131,5 cm');
    expect(values).toContain('140\u2013170 cm');
  });

  it('puts the label before the value in every fact', async () => {
    const { element, openDetails } = await render();
    openDetails();
    const facts = Array.from(element.querySelectorAll('.fact'));
    expect(facts.length).toBeGreaterThan(6);
    for (const fact of facts) {
      expect(fact.firstElementChild!.tagName).toBe('DT');
      expect(fact.lastElementChild!.tagName).toBe('DD');
    }
  });

  it('shows the class label before the class value', async () => {
    const { element, openDetails } = await render();
    openDetails();
    const classFact = Array.from(element.querySelectorAll('.extra .fact')).find(
      (fact) => fact.querySelector('dt')?.textContent?.trim() === 'Class',
    )!;
    expect(classFact.firstElementChild!.textContent!.trim()).toBe('Class');
    expect(classFact.lastElementChild!.textContent!.trim()).toBe('Mammal');
  });

  it('updates the ranges when the language is switched', async () => {
    const { fixture, element } = await render({
      animal: { ...okapi, weightKgMin: null, weightKgMax: 0.5 } as unknown as Animal,
    });
    const values = () => Array.from(element.querySelectorAll('.facts dd')).map((dd) => dd.textContent!.trim());
    expect(values()).toContain('up to 0.5 kg');
    expect(values()).toContain('20\u201330 years');
    TestBed.inject(LanguageService).setLanguage('de');
    fixture.detectChanges();
    expect(values()).toContain('bis zu 0,5 kg');
    expect(values()).toContain('20\u201330 Jahre');
  });
});