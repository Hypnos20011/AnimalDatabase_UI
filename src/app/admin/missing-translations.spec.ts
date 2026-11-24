import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { MissingTranslations } from './missing-translations';
import { AnimalService, MissingTranslation } from '../shared/animal.service';
import { Animal } from '../animal-model/animal.model';
import { LanguageService } from '../shared/i18n/language.service';
import { MissingTranslationCountService } from '../shared/missing-translation-count.service';

const rows: MissingTranslation[] = [
  {
    id: 4,
    commonName: 'Okapi',
    languages: [
      { language: 'de', fields: ['habitat'] },
      { language: 'fr', fields: ['commonName', 'profile'] },
    ],
  },
];

const animals: Animal[] = [
  {
    id: 4,
    commonName: 'Okapi',
    scientificName: null,
    family: null,
    taxonomicClass: null,
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
    habitat: null,
    habitatType: null,
    rangeRegion: null,
    profile: null,
    sourceUrl: null,
    thumbnailUrl: null,
    createdAt: '',
    updatedAt: '',
  },
];

const animalsForEntries: Animal[] = [
  { ...animals[0], id: 4, commonName: 'Okapi' },
  { ...animals[0], id: 1, commonName: 'Zebra' },
  { ...animals[0], id: 2, commonName: 'Bear' },
  { ...animals[0], id: 3, commonName: 'Alpaca' },
];

const rowsForEntries: MissingTranslation[] = [
  { id: 1, commonName: 'Zebra', languages: [{ language: 'de', fields: ['habitat'] }] },
  { id: 4, commonName: 'Okapi', languages: [{ language: 'fr', fields: ['profile'] }] },
  { id: 3, commonName: 'Alpaca', languages: [] },
];

describe('MissingTranslations', () => {
  beforeAll(() => {
    const proto = HTMLDialogElement.prototype as unknown as {
      showModal?: () => void;
      close?: () => void;
    };
    proto.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    proto.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
  });

  function setup(
    missing = vi.fn(() => of(rows)),
    translate = vi.fn(() => of(rows[0])),
    getAll = vi.fn(() => of(animals)),
  ) {
    TestBed.configureTestingModule({
      imports: [MissingTranslations],
      providers: [
        provideRouter([]),
        {
          provide: AnimalService,
          useValue: {
            getAll,
            getTranslation: vi.fn(() => of({ commonName: null, habitat: null, rangeRegion: null, profile: null })),
            missingTranslations: missing,
            translateMissing: translate,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(MissingTranslations);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement, missing, translate, getAll };
  }

  it('lists the animal, the languages, the fields, and an edit link', () => {
    const { fixture, element } = setup();

    expect(element.querySelector('h2')!.textContent).toBe('Translations');
    expect(element.querySelector('.links a')!.textContent).toBe('Admin');
    expect(element.textContent).toContain('Okapi');
    expect(element.textContent).toContain('German: habitat');
    expect(element.textContent).toContain('French: name, profile');
    const edit = element.querySelector<HTMLButtonElement>('button.edit')!;
    expect(edit.type).toBe('button');
    expect(edit.textContent!.trim()).toBe('Edit');

    edit.click();
    fixture.detectChanges();
    const dialog = element.querySelector<HTMLDialogElement>('app-translation-editor dialog')!;
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('h2')!.textContent).toBe('Okapi');
    expect(dialog.querySelector('button')!.textContent!.trim()).toBe('Cancel');

    dialog.querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.editing()).toBeNull();
    expect(dialog.open).toBe(false);
  });

  it('shows every animal with a complete label when nothing is missing', () => {
    const { element } = setup(vi.fn(() => of([])));

    expect(element.textContent).toContain('Every animal has German and French text.');
    expect(element.textContent).toContain('Okapi');
    expect(element.textContent).toContain('Complete');
    expect(element.querySelector('.gaps > li button.btn-primary')).toBeNull();
  });

  it('waits for both lists before publishing them', () => {
    const animalsRequest = new Subject<Animal[]>();
    const missingRequest = new Subject<MissingTranslation[]>();
    const { fixture, getAll, missing } = setup(
      vi.fn(() => missingRequest),
      undefined,
      vi.fn(() => animalsRequest),
    );
    const component = fixture.componentInstance;

    expect(getAll).toHaveBeenCalledOnce();
    expect(missing).toHaveBeenCalledOnce();
    expect(component.loading()).toBe(true);

    animalsRequest.next(animals);
    animalsRequest.complete();
    expect(component.allAnimals()).toEqual([]);
    expect(component.rows()).toEqual([]);
    expect(component.loading()).toBe(true);

    missingRequest.next(rows);
    missingRequest.complete();
    expect(component.allAnimals()).toEqual(animals);
    expect(component.rows()).toEqual(rows);
    expect(component.loading()).toBe(false);
  });

  it('combines all animals with missing languages and sorts missing entries first', () => {
    const { fixture, element } = setup(
      vi.fn(() => of(rowsForEntries)),
      undefined,
      vi.fn(() => of(animalsForEntries)),
    );

    expect(fixture.componentInstance.entries()).toEqual([
      { id: 4, commonName: 'Okapi', languages: rowsForEntries[1].languages },
      { id: 1, commonName: 'Zebra', languages: rowsForEntries[0].languages },
      { id: 3, commonName: 'Alpaca', languages: [] },
      { id: 2, commonName: 'Bear', languages: [] },
    ]);
    expect(
      Array.from(element.querySelectorAll('.gaps > li .gap-head > a:first-child')).map((link) =>
        link.textContent,
      ),
    ).toEqual(['Okapi', 'Zebra', 'Alpaca', 'Bear']);
    expect(element.querySelectorAll('.gaps > li button.btn-primary')).toHaveLength(2);
    expect(element.querySelectorAll('.gaps > li > p')).toHaveLength(2);
  });

  it('shows localized page titles and completion labels', () => {
    const { fixture, element } = setup(vi.fn(() => of([])));
    const language = TestBed.inject(LanguageService);

    for (const [locale, title, complete] of [
      ['de', 'Übersetzungen', 'Vollständig'],
      ['fr', 'Traductions', 'Complet'],
    ] as const) {
      language.language.set(locale);
      fixture.detectChanges();
      expect(element.querySelector('h2')!.textContent).toBe(title);
      expect(element.textContent).toContain(complete);
      expect(element.querySelector('.links a')!.textContent).toBe(language.t('footer.admin'));
    }

    language.language.set('en');
    fixture.detectChanges();
    expect(element.querySelector('h2')!.textContent).toBe('Translations');
    expect(element.querySelector('.links a')!.textContent).toBe(language.t('footer.admin'));
  });

  it('keeps translated animals in entries and recomputes their sorted position', () => {
    const translated: MissingTranslation = { id: 4, commonName: 'Okapi', languages: [] };
    const { fixture } = setup(
      vi.fn(() => of(rowsForEntries)),
      vi.fn(() => of(translated)),
      vi.fn(() => of(animalsForEntries)),
    );
    const component = fixture.componentInstance;

    component.translate(rowsForEntries[1]);

    expect(component.entries().map((entry) => entry.commonName)).toEqual([
      'Zebra',
      'Alpaca',
      'Bear',
      'Okapi',
    ]);
    expect(component.entries().find((entry) => entry.id === 4)?.languages).toEqual([]);
  });

  it('closes the editor and reloads both lists after translations are saved', () => {
    const missing = vi.fn(() => of(rows));
    const getAll = vi.fn(() => of(animals));
    const { fixture } = setup(missing, undefined, getAll);
    const component = fixture.componentInstance;
    const refresh = vi.spyOn(TestBed.inject(MissingTranslationCountService), 'refresh');
    component.editing.set(rows[0]);

    component.onEditorSaved();

    expect(component.editing()).toBeNull();
    expect(getAll).toHaveBeenCalledTimes(2);
    expect(missing).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('keeps an animal in entries after its missing text is filled', () => {
    const translate = vi.fn(() => of({ id: 4, commonName: 'Okapi', languages: [] }));
    const { element, fixture } = setup(undefined, translate);

    element.querySelector<HTMLButtonElement>('button.btn-primary')!.click();
    fixture.detectChanges();

    expect(translate).toHaveBeenCalledWith(4);
    expect(element.textContent).toContain('Every animal has German and French text.');
    expect(element.textContent).toContain('Okapi');
    expect(element.textContent).toContain('Complete');
    expect(element.querySelector('.gaps > li button.btn-primary')).toBeNull();
  });

  it('shows an error when the list cannot be loaded', () => {
    const { element } = setup(vi.fn(() => throwError(() => new Error('down'))));

    expect(element.querySelector('[role="alert"]')!.textContent).toContain(
      'Could not load missing translations.',
    );
  });

  it('shows an error when all animals cannot be loaded', () => {
    const { element } = setup(
      undefined,
      undefined,
      vi.fn(() => throwError(() => new Error('down'))),
    );

    expect(element.querySelector('[role="alert"]')!.textContent).toContain(
      'Could not load missing translations.',
    );
  });
});
