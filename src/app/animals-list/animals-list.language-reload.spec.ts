import { TestBed } from '@angular/core/testing';
import { provideLockedAdmin } from './animals-list-test-support';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AnimalsList } from './animals-list';
import { AnimalService } from '../shared/animal.service';
import { SearchService } from './search.service';
import { Animal } from '../animal-model/animal.model';
import { LanguageService } from '../shared/i18n/language.service';

function animal(id: number, commonName: string): Animal {
  return {
    id,
    commonName,
    scientificName: null,
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
    iucnStatus: 'Critically Endangered',
    habitat: null,
    habitatType: 'freshwater',
    rangeRegion: null,
    profile: null,
    thumbnailUrl: null,
    createdAt: '2026-10-08T10:00:00',
    updatedAt: '2026-10-08T10:00:00',
  } as unknown as Animal;
}

describe('AnimalsList language reload', () => {
  let getAll: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    window.scrollTo = vi.fn() as never;
    getAll = vi.fn((language?: string) =>
      of([animal(1, language === 'de' ? 'Mexikanischer Querzahnmolch' : 'Axolotl')]),
    );
  });

  afterEach(() => localStorage.clear());

  it('ignores a slow answer from the previous language', async () => {
    const english = new Subject<Animal[]>();
    const german = new Subject<Animal[]>();
    getAll = vi.fn((language?: string) => (language === 'de' ? german : english));
    const { component, fixture } = await renderList();

    TestBed.inject(LanguageService).setLanguage('de');
    fixture.detectChanges();
    await fixture.whenStable();

    german.next([animal(1, 'Querzahnmolch')]);
    english.next([animal(1, 'Axolotl')]);

    expect(component.animals()[0].commonName).toBe('Querzahnmolch');
  });

  async function renderList() {
    TestBed.configureTestingModule({
      imports: [AnimalsList],
      providers: [
        provideLockedAdmin(),
        provideRouter([]),
        { provide: AnimalService, useValue: { getAll } },
        { provide: SearchService, useValue: { getTop: vi.fn(() => of([])), record: vi.fn(() => of(undefined)) } },
      ],
    });
    const fixture = TestBed.createComponent(AnimalsList);
    fixture.detectChanges();
    await fixture.whenStable();
    return { fixture, component: fixture.componentInstance };
  }

  async function render() {
    TestBed.configureTestingModule({
      imports: [AnimalsList],
      providers: [
        provideLockedAdmin(),
        provideRouter([]),
        { provide: AnimalService, useValue: { getAll } },
        { provide: SearchService, useValue: { getTop: vi.fn(() => of([])), record: vi.fn(() => of(undefined)) } },
      ],
    });
    const fixture = TestBed.createComponent(AnimalsList);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const names = () => fixture.componentInstance.animals().map((a) => a.commonName);
    return { fixture, names };
  }

  async function switchTo(fixture: Awaited<ReturnType<typeof render>>['fixture'], lang: 'en' | 'de') {
    TestBed.inject(LanguageService).setLanguage(lang);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('loads the animals in English by default', async () => {
    const { names } = await render();
    expect(getAll).toHaveBeenCalledTimes(1);
    expect(getAll).toHaveBeenCalledWith('en');
    expect(names()).toEqual(['Axolotl']);
  });

  it('loads the animals in the stored language', async () => {
    localStorage.setItem('language', 'de');
    const { names } = await render();
    expect(getAll).toHaveBeenCalledTimes(1);
    expect(getAll).toHaveBeenCalledWith('de');
    expect(names()).toEqual(['Mexikanischer Querzahnmolch']);
  });

  it('reloads the animals when the language is switched', async () => {
    const { fixture, names } = await render();
    await switchTo(fixture, 'de');
    expect(getAll).toHaveBeenCalledTimes(2);
    expect(getAll).toHaveBeenLastCalledWith('de');
    expect(names()).toEqual(['Mexikanischer Querzahnmolch']);
    await switchTo(fixture, 'en');
    expect(getAll).toHaveBeenCalledTimes(3);
    expect(names()).toEqual(['Axolotl']);
  });

  it('does not reload when the same language is set again', async () => {
    const { fixture } = await render();
    await switchTo(fixture, 'en');
    expect(getAll).toHaveBeenCalledTimes(1);
  });

  it('shows the translated name in the rendered list', async () => {
    const { fixture } = await render();
    await switchTo(fixture, 'de');
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Mexikanischer Querzahnmolch');
    expect(element.textContent).not.toContain('Axolotl');
  });
});