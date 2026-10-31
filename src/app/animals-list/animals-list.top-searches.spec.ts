import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { AnimalsList } from './animals-list';
import { AnimalService } from '../shared/animal.service';
import { SearchService } from './search.service';
import { AnimalListState } from './animal-list-state';
import { TopSearch } from '../animal-model/top-search.model';

const axolotl: TopSearch = {
  animalId: 4,
  commonName: 'Axolotl',
  thumbnailUrl: null,
  searchCount: 3,
} as TopSearch;

describe('AnimalsList top searches window', () => {
  async function setup(
    getTop: (limit?: number, days?: number) => Observable<TopSearch[]>,
    before?: () => void,
  ) {
    const searchService = { getTop: vi.fn(getTop), record: vi.fn(() => of(undefined)) };
    TestBed.configureTestingModule({
      imports: [AnimalsList],
      providers: [
        provideRouter([]),
        { provide: AnimalService, useValue: { getAll: vi.fn(() => of([])) } },
        { provide: SearchService, useValue: searchService },
      ],
    });
    before?.();
    const fixture = TestBed.createComponent(AnimalsList);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const section = () => element.querySelector<HTMLElement>('.top-searches');
    const select = () => element.querySelector<HTMLSelectElement>('.top-searches select')!;
    const choose = async (value: string) => {
      select().value = value;
      select().dispatchEvent(new Event('change'));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    return { fixture, searchService, section, select, choose };
  }

  it('loads the last 30 days by default and shows the window', async () => {
    const { searchService, section, select } = await setup(() => of([axolotl]));

    expect(searchService.getTop).toHaveBeenCalledWith(5, 30);
    expect(section()!.querySelector('h3')!.textContent).toContain('Top searches');
    expect(select().getAttribute('aria-label')).toBe('Top searches time window');
    expect(select().selectedOptions[0].textContent!.trim()).toBe('Last 30 days');
    expect(section()!.querySelector('.top-name')!.textContent).toBe('Axolotl');
  });

  it('reloads with the chosen window and remembers it', async () => {
    const { searchService, choose, select } = await setup(() => of([axolotl]));

    await choose('7');

    expect(searchService.getTop).toHaveBeenLastCalledWith(5, 7);
    expect(TestBed.inject(AnimalListState).topSearchDays()).toBe(7);
    expect(select().selectedOptions[0].textContent!.trim()).toBe('Last 7 days');

    await choose('0');

    expect(searchService.getTop).toHaveBeenLastCalledWith(5, 0);
    expect(select().selectedOptions[0].textContent!.trim()).toBe('All time');
  });

  it('shows the empty state for the window', async () => {
    const { section, choose } = await setup(() => of([]));

    expect(section()!.querySelector('.top-empty')!.textContent!.trim()).toBe(
      'No searches in the last 30 days.',
    );
    expect(section()!.querySelector('ul')).toBeNull();

    await choose('7');
    expect(section()!.querySelector('.top-empty')!.textContent!.trim()).toBe(
      'No searches in the last 7 days.',
    );

    await choose('0');
    expect(section()!.querySelector('.top-empty')!.textContent!.trim()).toBe('No searches yet.');
  });

  it('starts from the remembered window', async () => {
    const { searchService, select } = await setup(
      () => of([axolotl]),
      () => TestBed.inject(AnimalListState).topSearchDays.set(7),
    );

    expect(searchService.getTop).toHaveBeenCalledWith(5, 7);
    expect(select().selectedOptions[0].textContent!.trim()).toBe('Last 7 days');
  });

  it('says so when top searches cannot be loaded', async () => {
    const { section } = await setup(() => throwError(() => new Error('offline')));

    expect(section()!.querySelector('.top-empty')!.textContent!.trim()).toBe(
      'Top searches are unavailable right now.',
    );
  });
});
