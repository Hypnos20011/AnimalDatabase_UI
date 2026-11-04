import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
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
    taxonomicClass: 'mammal',
    isDomesticated: false,
    sizeLengthCmMin: null,
    sizeLengthCmMax: null,
    sizeHeightCmMin: null,
    sizeHeightCmMax: null,
    weightKgMin: null,
    weightKgMax: null,
    lifespanYearsMin: null,
    lifespanYearsMax: null,
    iucnStatus: 'Least Concern',
    habitat: null,
    habitatType: 'forest',
    rangeRegion: null,
    profile: null,
    thumbnailUrl: null,
    createdAt: '2026-10-08T10:00:00',
    updatedAt: '2026-10-08T10:00:00',
  } as unknown as Animal;
}

describe('AnimalsList translation', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = '';
  });

  afterEach(() => {
    localStorage.clear();
  });

  async function render(data: Animal[] = [animal(1, 'Okapi')]) {
    TestBed.configureTestingModule({
      imports: [AnimalsList],
      providers: [
        provideRouter([]),
        { provide: AnimalService, useValue: { getAll: vi.fn(() => of(data)) } },
        { provide: SearchService, useValue: { getTop: vi.fn(() => of([])), record: vi.fn(() => of(undefined)) } },
      ],
    });
    const fixture = TestBed.createComponent(AnimalsList);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const text = (selector: string) => element.querySelector(selector)?.textContent?.trim() ?? '';
    const search = () => element.querySelector<HTMLInputElement>('input.search')!;
    const openFilters = () => {
      element.querySelector<HTMLButtonElement>('.filter-toggle')!.click();
      fixture.detectChanges();
    };
    return { fixture, element, text, search, openFilters };
  }

  it('shows the English texts by default', async () => {
    const { text, search, element } = await render();
    expect(text('.page-head h2')).toContain('Animals');
    expect(search().getAttribute('aria-label')).toBe('Search animals');
    expect(search().placeholder).toBe('Search name, habitat or range...');
    expect(text('.filter-toggle')).toContain('Filters');
    expect(element.querySelector('.sort .visually-hidden')!.textContent!.trim()).toBe('Sort by');
  });

  it('shows the German texts when German is stored', async () => {
    localStorage.setItem('language', 'de');
    const { text, search, element } = await render();
    expect(text('.page-head h2')).toContain('Tiere');
    expect(search().getAttribute('aria-label')).toBe('Tiere durchsuchen');
    expect(search().placeholder).toBe('Name, Lebensraum oder Verbreitung suchen...');
    expect(text('.filter-toggle')).toContain('Filter');
    expect(element.querySelector('.sort .visually-hidden')!.textContent!.trim()).toBe('Sortieren nach');
  });

  it('updates the texts when the language is switched', async () => {
    const { fixture, text, search } = await render();
    TestBed.inject(LanguageService).setLanguage('de');
    fixture.detectChanges();
    expect(text('.page-head h2')).toContain('Tiere');
    expect(search().placeholder).toBe('Name, Lebensraum oder Verbreitung suchen...');
  });

  it('translates the filter dialog', async () => {
    localStorage.setItem('language', 'de');
    const { element, text, openFilters } = await render();
    openFilters();
    const labels = Array.from(element.querySelectorAll('.modal .chip-label')).map((label) =>
      label.textContent!.trim(),
    );
    expect(labels).toEqual(['Klasse:', 'Status:', 'Lebensraum:', 'Typ:', 'Länge (cm):', 'Gewicht (kg):']);
    expect(text('#filters-title')).toBe('Filter');
    expect(element.querySelector('.modal .close')!.getAttribute('aria-label')).toBe('Schließen');
    const placeholders = Array.from(
      element.querySelectorAll<HTMLInputElement>('.filter-ranges input'),
    ).map((input) => input.placeholder);
    expect(placeholders).toEqual(['von', 'bis', 'von', 'bis']);
    const chips = Array.from(element.querySelectorAll('.modal .chip')).map((chip) => chip.textContent!.trim());
    expect(chips).toContain('Nur Wildtiere');
    expect(text('.modal-footer .chip')).toBe('Alle zurücksetzen');
  });

  it('translates the top searches heading and window label', async () => {
    localStorage.setItem('language', 'de');
    const { element, text } = await render();
    expect(text('#top-searches-title')).toBe('Meistgesucht');
    expect(element.querySelector('.top-head select')!.getAttribute('aria-label')).toBe(
      'Zeitraum der Top-Suchen',
    );
  });

  it('translates the empty state', async () => {
    localStorage.setItem('language', 'de');
    const { text } = await render([]);
    expect(text('.state-message')).toBe('Keine Tiere passen zu deinen Filtern.');
  });

  it('translates the sort options', async () => {
    localStorage.setItem('language', 'de');
    const { element } = await render();
    const options = Array.from(element.querySelectorAll('.sort option')).map((option) =>
      option.textContent!.trim(),
    );
    expect(options).toEqual([
      'Beste Treffer',
      'Name (A bis Z)',
      'Name (Z bis A)',
      'Längste zuerst',
      'Kürzeste zuerst',
      'Schwerste zuerst',
      'Leichteste zuerst',
      'Neueste zuerst',
    ]);
  });

  it('translates the top searches time windows', async () => {
    localStorage.setItem('language', 'de');
    const { element } = await render();
    const options = Array.from(element.querySelectorAll('.top-head option')).map((option) =>
      option.textContent!.trim(),
    );
    expect(options).toEqual(['Letzte 7 Tage', 'Letzte 30 Tage', 'Gesamter Zeitraum']);
  });

  it('updates the sort options when the language is switched', async () => {
    const { fixture, element } = await render();
    const first = () => element.querySelector('.sort option')!.textContent!.trim();
    expect(first()).toBe('Best match');
    TestBed.inject(LanguageService).setLanguage('de');
    fixture.detectChanges();
    expect(first()).toBe('Beste Treffer');
  });

  it('translates the animal count with plurals', async () => {
    localStorage.setItem('language', 'de');
    const one = await render([animal(1, 'Okapi')]);
    expect(one.fixture.componentInstance.countText()).toBe('1 Tier');
    expect(one.fixture.componentInstance.showAnimalsLabel()).toBe('1 Tier anzeigen');
    TestBed.resetTestingModule();
    const two = await render([animal(1, 'Okapi'), animal(2, 'Aye-aye')]);
    expect(two.fixture.componentInstance.countText()).toBe('2 Tiere');
    expect(two.fixture.componentInstance.showAnimalsLabel()).toBe('2 Tiere anzeigen');
  });

  it('updates the animal count when the language is switched', async () => {
    const { fixture } = await render([animal(1, 'Okapi'), animal(2, 'Aye-aye')]);
    expect(fixture.componentInstance.countText()).toBe('2 animals');
    expect(fixture.componentInstance.showAnimalsLabel()).toBe('Show 2 animals');
    TestBed.inject(LanguageService).setLanguage('de');
    expect(fixture.componentInstance.countText()).toBe('2 Tiere');
    expect(fixture.componentInstance.showAnimalsLabel()).toBe('2 Tiere anzeigen');
  });

  it('translates the top searches unavailable text', async () => {
    localStorage.setItem('language', 'de');
    const { fixture } = await render();
    fixture.componentInstance.topError.set(true);
    expect(fixture.componentInstance.topEmptyText()).toBe('Die Top-Suchen sind gerade nicht verfügbar.');
  });

  it('words the top searches empty text for each window in English', async () => {
    const { fixture } = await render();
    const list = fixture.componentInstance;
    list.topSearchDays.set(30);
    expect(list.topEmptyText()).toBe('No searches in the last 30 days.');
    list.topSearchDays.set(7);
    expect(list.topEmptyText()).toBe('No searches in the last 7 days.');
    list.topSearchDays.set(0);
    expect(list.topEmptyText()).toBe('No searches yet.');
  });

  it('words the top searches empty text for each window in German', async () => {
    localStorage.setItem('language', 'de');
    const { fixture } = await render();
    const list = fixture.componentInstance;
    list.topSearchDays.set(30);
    expect(list.topEmptyText()).toBe('Keine Suchen in den letzten 30 Tagen.');
    list.topSearchDays.set(7);
    expect(list.topEmptyText()).toBe('Keine Suchen in den letzten 7 Tagen.');
    list.topSearchDays.set(0);
    expect(list.topEmptyText()).toBe('Noch keine Suchen.');
  });

  it('translates the class, status and habitat chips', async () => {
    localStorage.setItem('language', 'de');
    const okapi = { ...animal(1, 'Okapi'), iucnStatus: 'endangered' } as Animal;
    const { element, openFilters } = await render([okapi]);
    openFilters();
    const chips = Array.from(element.querySelectorAll('.modal .chip')).map((chip) => chip.textContent!.trim());
    expect(chips).toContain('Säugetier');
    expect(chips).toContain('Stark gefährdet · 1');
    expect(chips).toContain('Wald · 1');
  });

  it('translates the class and status in each row', async () => {
    localStorage.setItem('language', 'de');
    const okapi = { ...animal(1, 'Okapi'), iucnStatus: 'endangered' } as Animal;
    const dog = { ...animal(2, 'Dog'), iucnStatus: null } as unknown as Animal;
    const { element } = await render([okapi, dog]);
    const all = Array.from(element.querySelectorAll('li a'));
    const rows = [all.find((row) => row.textContent!.includes('Okapi'))!, all.find((row) => row.textContent!.includes('Dog'))!];
    expect(rows[0].querySelector('.cls')!.textContent!.trim()).toBe('S\u00e4ugetier');
    expect(rows[0].querySelector('.code')!.getAttribute('title')).toBe('Stark gef\u00e4hrdet');
    expect(rows[0].querySelector('.code')!.textContent!.trim()).toBe('EN');
    expect(rows[0].querySelector('.visually-hidden')!.textContent).toContain('Stark gef\u00e4hrdet');
    expect(rows[1].querySelector('.code')!.getAttribute('title')).toBe('Status unbekannt');
    expect(rows[1].querySelector('.visually-hidden')!.textContent).toContain('Status unbekannt');
  });

  it('translates the habitat type in the preview', async () => {
    localStorage.setItem('language', 'de');
    const okapi = { ...animal(1, 'Okapi'), family: 'Giraffidae' } as Animal;
    const { text } = await render([okapi]);
    expect(text('.preview-extra')).toBe('Giraffidae / Wald');
  });

  it('translates the match hints', async () => {
    const okapi = { ...animal(1, 'Okapi'), habitat: 'rainforest canopy', rangeRegion: 'Congo' } as Animal;
    const { fixture, element, search } = await render([okapi]);
    const hint = () => element.querySelector('.match-hint')?.textContent?.trim();
    search().value = 'canopy';
    search().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(hint()).toBe('Matches habitat');
    TestBed.inject(LanguageService).setLanguage('de');
    fixture.detectChanges();
    expect(hint()).toBe('Treffer im Lebensraum');
    search().value = 'congo';
    search().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(hint()).toBe('Treffer in der Verbreitung');
  });

  it('shows a translated error when the animals cannot be loaded', async () => {
    localStorage.setItem('language', 'de');
    TestBed.configureTestingModule({
      imports: [AnimalsList],
      providers: [
        provideRouter([]),
        {
          provide: AnimalService,
          useValue: { getAll: vi.fn(() => throwError(() => new Error('Http failure response'))) },
        },
        { provide: SearchService, useValue: { getTop: vi.fn(() => of([])), record: vi.fn(() => of(undefined)) } },
      ],
    });
    const fixture = TestBed.createComponent(AnimalsList);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const message = () => element.querySelector('.error-message')!.textContent!.trim();
    expect(message()).toBe('Die Tiere konnten nicht geladen werden. Bitte versuche es sp\u00e4ter noch einmal.');
    expect(message()).not.toContain('Http failure');
    TestBed.inject(LanguageService).setLanguage('en');
    fixture.detectChanges();
    expect(message()).toBe('Could not load the animals. Please try again later.');
  });
});