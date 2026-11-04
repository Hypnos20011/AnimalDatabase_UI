import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Stats } from './stats';
import { AnimalStats } from '../animal-model/animal-stats.model';
import { environment } from '../../environments/environment';
import { LanguageService } from '../shared/i18n/language.service';

const sampleStats: AnimalStats = {
  totalAnimals: 18,
  domesticatedAnimals: 2,
  byClass: { mammal: 9, fish: 2 },
  byIucnStatus: { LC: 4, unknown: 5 },
  byHabitatType: { 'deep sea': 1, forest: 10, unknown: 7 },
};

describe('Stats', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Stats],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('has no stats before the API answers', () => {
    const component = TestBed.createComponent(Stats).componentInstance;
    expect(component.stats()).toBeUndefined();
    http.expectOne(`${environment.apiUrl}/stats`);
  });

  it('loads the stats when it opens', () => {
    const component = TestBed.createComponent(Stats).componentInstance;
    http.expectOne(`${environment.apiUrl}/stats`).flush(sampleStats);
    expect(component.stats()).toEqual(sampleStats);
  });
});

describe('Stats page', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Stats],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function render(stats?: AnimalStats): HTMLElement {
    const fixture = TestBed.createComponent(Stats);
    fixture.detectChanges();
    const request = http.expectOne(`${environment.apiUrl}/stats`);
    if (stats) {
      request.flush(stats);
      fixture.detectChanges();
    }
    return fixture.nativeElement as HTMLElement;
  }

  function lists(page: HTMLElement): string[][] {
    return Array.from(page.querySelectorAll('ul')).map((list) =>
      Array.from(list.querySelectorAll('li')).map((item) => item.textContent?.trim() ?? ''),
    );
  }

  it('shows nothing while loading', () => {
    const page = render();
    expect(page.querySelectorAll('p, ul').length).toBe(0);
  });

  it('shows the total and domesticated counts', () => {
    const text = render(sampleStats).textContent ?? '';
    expect(text).toContain('Total animals: 18');
    expect(text).toContain('Domesticated: 2');
  });

  it('lists every class with its count', () => {
    expect(lists(render(sampleStats))[0]).toEqual(['fish: 2', 'mammal: 9']);
  });

  it('lists every IUCN status with its count', () => {
    expect(lists(render(sampleStats))[1]).toEqual(['LC: 4', 'unknown: 5']);
  });

  it('lists every habitat type with its count under its own heading', () => {
    const page = render(sampleStats);
    const headings = Array.from(page.querySelectorAll('h3')).map((h) => h.textContent?.trim());
    expect(headings[2]).toBe('By habitat type');
    expect(lists(page)[2]).toEqual(['deep sea: 1', 'forest: 10', 'unknown: 7']);
  });
});

describe('Stats page translation', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [Stats],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  function render() {
    const fixture = TestBed.createComponent(Stats);
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/stats`).flush(sampleStats);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    const headings = () => Array.from(page.querySelectorAll('h3')).map((h) => h.textContent?.trim());
    const counts = () => Array.from(page.querySelectorAll('p')).map((p) => p.textContent?.trim());
    return { fixture, headings, counts };
  }

  it('shows the English labels by default', () => {
    const { headings, counts } = render();
    expect(counts()).toEqual(['Total animals: 18', 'Domesticated: 2']);
    expect(headings()).toEqual(['By class', 'By IUCN status', 'By habitat type']);
  });

  it('shows the German labels when German is stored', () => {
    localStorage.setItem('language', 'de');
    const { headings, counts } = render();
    expect(counts()).toEqual(['Tiere insgesamt: 18', 'Haustiere: 2']);
    expect(headings()).toEqual(['Nach Klasse', 'Nach IUCN-Status', 'Nach Lebensraumtyp']);
  });

  it('updates the labels when the language is switched', () => {
    const { fixture, headings, counts } = render();
    TestBed.inject(LanguageService).setLanguage('de');
    fixture.detectChanges();
    expect(counts()[0]).toBe('Tiere insgesamt: 18');
    expect(headings()[0]).toBe('Nach Klasse');
  });
});