import { TestBed } from '@angular/core/testing';
import { provideLockedAdmin } from './animals-list-test-support';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AnimalsList } from './animals-list';
import { AnimalService } from '../shared/animal.service';
import { SearchService } from './search.service';
import { Animal } from '../animal-model/animal.model';
import { RandomAnimalService } from '../shared/random-animal.service';
import { LanguageService } from '../shared/i18n/language.service';

function animal(id: number, commonName: string): Animal {
  return {
    id,
    commonName,
    scientificName: null,
    family: null,
    taxonomicClass: 'mammal',
    isDomesticated: false,
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
    habitatType: null,
    rangeRegion: null,
    profile: null,
    thumbnailUrl: null,
    createdAt: '2026-10-08T10:00:00',
    updatedAt: '2026-10-08T10:00:00',
  } as unknown as Animal;
}

const animals = [animal(1, 'Okapi'), animal(2, 'Anglerfish'), animal(3, 'Tapir')];

describe('AnimalsList keyboard shortcuts', () => {
  const open = vi.fn();

  afterEach(() => {
    localStorage.removeItem('language');
    TestBed.inject(LanguageService).setLanguage('en');
  });

  beforeEach(() => {
    open.mockReset();
    TestBed.configureTestingModule({
      imports: [AnimalsList],
      providers: [
        provideLockedAdmin(),
        provideRouter([]),
        { provide: AnimalService, useValue: { getAll: vi.fn(() => of(animals)) } },
        {
          provide: SearchService,
          useValue: { getTop: vi.fn(() => of([])), record: vi.fn(() => of(undefined)) },
        },
        { provide: RandomAnimalService, useValue: { open } },
      ],
    });
  });

  async function render() {
    const fixture = TestBed.createComponent(AnimalsList);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  function searchInput(element: HTMLElement): HTMLInputElement {
    return element.querySelector('input.search')!;
  }

  function press(
    key: string,
    options: Partial<KeyboardEventInit> & { target?: EventTarget | null } = {},
  ): KeyboardEvent {
    const { target, ...init } = options;
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
    Object.defineProperty(event, 'target', { configurable: true, value: target ?? document.body });
    document.dispatchEvent(event);
    return event;
  }

  it('focuses the search input when / is pressed', async () => {
    const fixture = await render();
    const input = searchInput(fixture.nativeElement);
    const focus = vi.spyOn(input, 'focus');
    const select = vi.spyOn(input, 'select');

    const event = press('/');

    expect(event.defaultPrevented).toBe(true);
    expect(focus).toHaveBeenCalled();
    expect(select).toHaveBeenCalled();
  });

  it('opens a random animal when r or R is pressed', async () => {
    await render();

    press('r');
    press('R');

    expect(open).toHaveBeenCalledTimes(2);
  });

  it('does not steal keys while typing in an input', async () => {
    const fixture = await render();
    const input = searchInput(fixture.nativeElement);
    const focus = vi.spyOn(input, 'focus');

    press('/', { target: input });
    press('r', { target: input });

    expect(focus).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it('does not steal keys while a dialog is open', async () => {
    const fixture = await render();
    const input = searchInput(fixture.nativeElement);
    const focus = vi.spyOn(input, 'focus');
    fixture.componentInstance.filtersOpen.set(true);
    fixture.detectChanges();

    press('/');
    press('r');

    expect(focus).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it('ignores shortcuts when modifier keys are held', async () => {
    const fixture = await render();
    const input = searchInput(fixture.nativeElement);
    const focus = vi.spyOn(input, 'focus');

    press('/', { ctrlKey: true });
    press('r', { metaKey: true });
    press('R', { altKey: true });

    expect(focus).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it('exposes a tiny localized shortcut hint', async () => {
    const fixture = await render();
    const input = searchInput(fixture.nativeElement);
    const i18n = TestBed.inject(LanguageService);

    expect(input.getAttribute('aria-keyshortcuts')).toBe('/');
    expect(input.getAttribute('title')).toBe(i18n.t('list.shortcuts.hint'));
    expect(fixture.nativeElement.textContent).toContain(i18n.t('list.shortcuts.hint'));

    i18n.setLanguage('de');
    fixture.detectChanges();
    expect(input.getAttribute('title')).toBe('/ Suche · R Zufall');

    i18n.setLanguage('fr');
    fixture.detectChanges();
    expect(input.getAttribute('title')).toBe('/ recherche · R hasard');
  });
});
