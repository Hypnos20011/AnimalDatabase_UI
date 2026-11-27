import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Animal } from '../animal-model/animal.model';
import { AnimalService } from '../shared/animal.service';
import { AnimalsList } from './animals-list';
import { provideLockedAdmin } from './animals-list-test-support';
import { SearchService } from './search.service';

function animal(
  id: number,
  commonName: string,
  lengthMmMin: number | null,
  lengthMmMax: number | null,
  weightGramsMin: number | null,
  weightGramsMax: number | null,
  extra: Partial<Animal> = {},
): Animal {
  return {
    id,
    commonName,
    scientificName: null,
    family: null,
    taxonomicClass: 'mammal',
    isDomesticated: false,
    lengthMmMin,
    lengthMmMax,
    heightMmMin: null,
    heightMmMax: null,
    weightGramsMin,
    weightGramsMax,
    lifespanMonthsMin: null,
    lifespanMonthsMax: null,
    iucnStatus: null,
    habitat: null,
    habitatType: null,
    rangeRegion: null,
    profile: null,
    sourceUrl: null,
    thumbnailUrl: null,
    status: 'approved',
    submittedBy: 'admin',
    reviewedAt: null,
    reviewNote: null,
    createdAt: '',
    updatedAt: '',
    ...extra,
  };
}

const animals = [
  animal(1, 'Zero', 0, 0, 0, 0),
  animal(2, 'Below', 99, 99, 999, 999),
  animal(3, 'Boundary', 100, 100, 1000, 1000, { habitatType: 'forest' }),
  animal(4, 'Above', 101, 101, 1001, 1001, { isDomesticated: true }),
  animal(5, 'Range', 90, 110, 900, 1100, { habitatType: 'forest' }),
  animal(6, 'Min', 100, null, 1000, null),
  animal(7, 'Max', null, 100, null, 1000),
  animal(8, 'Unknown', null, null, null, null),
];

describe('AnimalsList canonical measurements', () => {
  const originalScrollTo = window.scrollTo;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.scrollTo = originalScrollTo;
  });

  async function setup() {
    TestBed.configureTestingModule({
      imports: [AnimalsList],
      providers: [
        provideLockedAdmin(),
        provideRouter([]),
        { provide: AnimalService, useValue: { getAll: vi.fn(() => of(animals)) } },
        { provide: SearchService, useValue: { getTop: vi.fn(() => of([])), record: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(AnimalsList);
    fixture.componentInstance.filtersOpen.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  function setInput(root: HTMLElement, index: number, value: string) {
    const input = root.querySelectorAll<HTMLInputElement>('.filter-ranges input')[index];
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function names(list: Animal[]) {
    return list.map((item) => item.commonName);
  }

  it('converts centimeter bounds to millimeters and includes overlapping endpoints', async () => {
    const fixture = await setup();
    const list = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    expect(list.filteredAnimals()).toHaveLength(8);

    setInput(root, 0, '10');
    expect(names(list.filteredAnimals())).toEqual(['Boundary', 'Above', 'Range', 'Min', 'Max']);
    setInput(root, 0, '');
    setInput(root, 1, '10');
    expect(names(list.filteredAnimals())).toEqual(['Zero', 'Below', 'Boundary', 'Range', 'Min', 'Max']);
    setInput(root, 0, '10');
    expect(names(list.filteredAnimals())).toEqual(['Boundary', 'Range', 'Min', 'Max']);
    expect(list.lengthFrom()).toBe(10);
    expect(list.lengthTo()).toBe(10);
    setInput(root, 1, '');
    setInput(root, 0, '10.1');
    expect(names(list.filteredAnimals())).toEqual(['Above', 'Range']);
  });

  it('converts kilogram bounds to grams at and around the 1 kg threshold', async () => {
    const fixture = await setup();
    const list = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;

    setInput(root, 2, '1');
    expect(names(list.filteredAnimals())).toEqual(['Boundary', 'Above', 'Range', 'Min', 'Max']);
    setInput(root, 2, '');
    setInput(root, 3, '1');
    expect(names(list.filteredAnimals())).toEqual(['Zero', 'Below', 'Boundary', 'Range', 'Min', 'Max']);
    setInput(root, 2, '1');
    expect(names(list.filteredAnimals())).toEqual(['Boundary', 'Range', 'Min', 'Max']);
    setInput(root, 2, '0.999');
    setInput(root, 3, '1.001');
    expect(names(list.filteredAnimals())).toEqual(['Below', 'Boundary', 'Above', 'Range', 'Min', 'Max']);
    expect(list.weightFrom()).toBe(0.999);
    expect(list.weightTo()).toBe(1.001);
    setInput(root, 2, '1.001');
    setInput(root, 3, '');
    expect(names(list.filteredAnimals())).toEqual(['Above', 'Range']);
  });

  it('handles zero, combines filters and resets without excluding unknown measurements', async () => {
    const fixture = await setup();
    const list = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;

    setInput(root, 1, '0');
    setInput(root, 3, '0');
    expect(names(list.filteredAnimals())).toEqual(['Zero']);
    expect(list.activeFilterCount()).toBe(2);
    fixture.detectChanges();
    list.clearAll();
    setInput(root, 0, '10');
    setInput(root, 2, '1');
    list.toggleHabitats('forest');
    expect(names(list.filteredAnimals())).toEqual(['Boundary', 'Range']);
    expect(list.activeFilterCount()).toBe(3);
    fixture.detectChanges();
    list.clearAll();
    fixture.detectChanges();
    expect(list.activeFilterCount()).toBe(0);
    expect(list.filteredAnimals()).toHaveLength(8);
    expect(Array.from(root.querySelectorAll<HTMLInputElement>('.filter-ranges input'), (input) => input.value))
      .toEqual(['', '', '', '']);
  });

  it('combines measurement filters with wild-only, search and sorting', async () => {
    const fixture = await setup();
    const list = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;

    setInput(root, 0, '10');
    setInput(root, 2, '1');
    list.toggleType();
    list.onSortChange('weight-desc');
    expect(names(list.sortedAnimals())).toEqual(['Range', 'Boundary', 'Max', 'Min']);
    list.onQueryChange('boundary');
    expect(names(list.sortedAnimals())).toEqual(['Boundary']);
  });

  it.each([
    ['length-asc', ['Zero', 'Below', 'Boundary', 'Max', 'Min', 'Above', 'Range', 'Unknown']],
    ['length-desc', ['Range', 'Above', 'Boundary', 'Max', 'Min', 'Below', 'Zero', 'Unknown']],
    ['weight-asc', ['Zero', 'Below', 'Boundary', 'Max', 'Min', 'Above', 'Range', 'Unknown']],
    ['weight-desc', ['Range', 'Above', 'Boundary', 'Max', 'Min', 'Below', 'Zero', 'Unknown']],
  ])('sorts %s using canonical values, fallback and name ties with unknowns last', async (sort, expected) => {
    const fixture = await setup();
    const select = (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>('.sort select')!;
    select.value = sort;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(names(fixture.componentInstance.sortedAnimals())).toEqual(expected);
  });
});
