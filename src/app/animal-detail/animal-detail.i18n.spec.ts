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
  lengthMmMin: 1800,
  lengthMmMax: 2500,
  heightMmMin: 1400,
  heightMmMax: 1700,
  weightGramsMin: 200000,
  weightGramsMax: 350000,
  lifespanMonthsMin: 240,
  lifespanMonthsMax: 360,
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
  {
    id: 2,
    animalId: 2,
    url: 'https://example.org/b.jpg',
    caption: null,
    attribution: null,
    sourcePageUrl: null,
  },
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

  async function render(options: { animal?: Animal; images?: AnimalImage[]; fail?: boolean } = {}) {
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
        {
          provide: AdminKeyService,
          useValue: { key: signal(null), unlocked: signal(false), role: signal('none') },
        },
      ],
    });
    const fixture = TestBed.createComponent(AnimalDetail);
    fixture.componentRef.setInput('id', '2');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const text = (selector: string) => element.querySelector(selector)?.textContent?.trim() ?? '';
    const labels = () =>
      Array.from(element.querySelectorAll('dt')).map((dt) => dt.textContent!.trim());
    const openDetails = () => {
      element.querySelector<HTMLButtonElement>('.more')!.click();
      fixture.detectChanges();
    };
    return { fixture, element, text, labels, openDetails };
  }

  it('shows the English labels by default', async () => {
    const { labels, text } = await render();
    expect(labels()).toEqual([
      'IUCN status',
      'Weight',
      'Lifespan',
      'Habitat type',
      'Habitat',
      'Range',
    ]);
    expect(text('.more')).toBe('More details');
    expect(text('.back')).toBe('Back to list');
  });

  it('shows the German labels when German is stored', async () => {
    localStorage.setItem('language', 'de');
    const { labels, text } = await render();
    expect(labels()).toEqual([
      'IUCN-Status',
      'Gewicht',
      'Lebensdauer',
      'Lebensraumtyp',
      'Lebensraum',
      'Verbreitung',
    ]);
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
    const values = Array.from(element.querySelectorAll('.extra dd')).map((dd) =>
      dd.textContent!.trim(),
    );
    expect(values).toContain('Wildtier');
  });

  it('translates the domesticated type', async () => {
    localStorage.setItem('language', 'de');
    const { element, openDetails } = await render({
      animal: { ...okapi, isDomesticated: true } as Animal,
    });
    openDetails();
    const values = Array.from(element.querySelectorAll('.extra dd')).map((dd) =>
      dd.textContent!.trim(),
    );
    expect(values).toContain('Haustier');
  });

  it('translates the unknown lifespan', async () => {
    localStorage.setItem('language', 'de');
    const { element } = await render({
      animal: { ...okapi, lifespanMonthsMin: null, lifespanMonthsMax: null },
    });
    const values = Array.from(element.querySelectorAll('.facts dd')).map((dd) =>
      dd.textContent!.trim(),
    );
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
    const values = Array.from(element.querySelectorAll('.extra dd')).map((dd) =>
      dd.textContent!.trim(),
    );
    expect(values).toContain('S\u00e4ugetier');
  });

  it('shows the English values by default', async () => {
    const { text, element, openDetails } = await render();
    expect(text('.status')).toBe('Endangered');
    expect(text('.habitat-type')).toBe('Forest');
    openDetails();
    const values = Array.from(element.querySelectorAll('.extra dd')).map((dd) =>
      dd.textContent!.trim(),
    );
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
      animal: {
        ...okapi,
        weightGramsMin: null,
        weightGramsMax: 1500,
        lifespanMonthsMin: null,
        lifespanMonthsMax: 360,
      },
    });
    const values = Array.from(element.querySelectorAll('.facts dd')).map((dd) =>
      dd.textContent!.trim(),
    );
    expect(values).toContain('bis zu 1,5 kg');
    expect(values).toContain('bis zu 30 Jahre');
  });

  it('displays a 25-month lifespan in months', async () => {
    const { element } = await render({
      animal: { ...okapi, lifespanMonthsMin: 25, lifespanMonthsMax: 25 },
    });
    const values = Array.from(element.querySelectorAll('.facts dd')).map((dd) =>
      dd.textContent!.trim(),
    );
    expect(values).toContain('25 months');
  });

  it('uses the singular month and at least in German', async () => {
    localStorage.setItem('language', 'de');
    const { element } = await render({
      animal: {
        ...okapi,
        weightGramsMin: 2000,
        weightGramsMax: null,
        lifespanMonthsMin: 1,
        lifespanMonthsMax: 1,
      },
    });
    const values = Array.from(element.querySelectorAll('.facts dd')).map((dd) =>
      dd.textContent!.trim(),
    );
    expect(values).toContain('mindestens 2 kg');
    expect(values).toContain('1 Monat');
  });

  it('uses German decimals in the size ranges', async () => {
    localStorage.setItem('language', 'de');
    const { element, openDetails } = await render({
      animal: { ...okapi, lengthMmMin: 5, lengthMmMax: 15 },
    });
    openDetails();
    const values = Array.from(element.querySelectorAll('.extra dd')).map((dd) =>
      dd.textContent!.trim(),
    );
    expect(values).toContain('0,5\u20131,5 cm');
    expect(values).toContain('1,4\u20131,7 m');
  });

  it('formats small canonical measurements and translates month ranges', async () => {
    const { fixture, element, openDetails } = await render({
      animal: {
        ...okapi,
        lengthMmMin: 1.25,
        lengthMmMax: 2.5,
        heightMmMin: null,
        heightMmMax: 25,
        weightGramsMin: 0.5,
        weightGramsMax: 1.25,
        lifespanMonthsMin: null,
        lifespanMonthsMax: 1,
      },
    });
    openDetails();
    const values = () =>
      Array.from(element.querySelectorAll('.facts dd')).map((dd) => dd.textContent!.trim());
    expect(values()).toEqual(
      expect.arrayContaining(['1.25–2.5 mm', 'up to 2.5 cm', '0.5–1.25 g', 'up to 1 month']),
    );

    TestBed.inject(LanguageService).setLanguage('fr');
    fixture.detectChanges();
    expect(values()).toEqual(
      expect.arrayContaining(['1,25–2,5 mm', 'jusqu’à 2,5 cm', '0,5–1,25 g', 'jusqu’à 1 mois']),
    );
  });

  it('displays zero and fractional years without rounding them away', async () => {
    localStorage.setItem('language', 'de');
    const { element } = await render({
      animal: {
        ...okapi,
        weightGramsMin: 0,
        weightGramsMax: 0,
        lifespanMonthsMin: 30,
        lifespanMonthsMax: 30,
      },
    });
    const values = Array.from(element.querySelectorAll('.facts dd')).map((dd) => dd.textContent!.trim());
    expect(values).toContain('0 g');
    expect(values).toContain('2,5 Jahre');
  });

  it('hides missing optional measurements', async () => {
    const { element, openDetails } = await render({
      animal: {
        ...okapi,
        lengthMmMin: null,
        lengthMmMax: null,
        heightMmMin: null,
        heightMmMax: null,
        weightGramsMin: null,
        weightGramsMax: null,
        lifespanMonthsMin: null,
        lifespanMonthsMax: null,
      },
    });
    openDetails();
    const labels = Array.from(element.querySelectorAll('dt')).map((dt) => dt.textContent!.trim());
    expect(labels).not.toContain('Weight');
    expect(labels).not.toContain('Body length');
    expect(labels).not.toContain('Shoulder height');
    expect(element.querySelector('.facts')!.textContent).toContain('Unknown');
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
      animal: { ...okapi, weightGramsMin: null, weightGramsMax: 1500 },
    });
    const values = () =>
      Array.from(element.querySelectorAll('.facts dd')).map((dd) => dd.textContent!.trim());
    expect(values()).toContain('up to 1.5 kg');
    expect(values()).toContain('20\u201330 years');
    TestBed.inject(LanguageService).setLanguage('de');
    fixture.detectChanges();
    expect(values()).toContain('bis zu 1,5 kg');
    expect(values()).toContain('20\u201330 Jahre');
  });
});
