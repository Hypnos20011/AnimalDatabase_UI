import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AnimalsList } from './animals-list';
import { AnimalService } from '../shared/animal.service';
import { SearchService } from './search.service';
import { AnimalListState } from './animal-list-state';
import { Animal } from '../animal-model/animal.model';

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

describe('AnimalsList scroll position', () => {
  let scrollTo: ReturnType<typeof vi.fn>;
  const originalScrollTo = window.scrollTo;

  beforeEach(() => {
    scrollTo = vi.fn();
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
    setScrollY(0);
  });

  afterEach(() => {
    window.scrollTo = originalScrollTo;
    setScrollY(0);
  });

  function setScrollY(value: number): void {
    Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value });
  }

  function configure(getAll: () => unknown = () => of(animals)) {
    TestBed.configureTestingModule({
      imports: [AnimalsList],
      providers: [
        provideRouter([{ path: 'animals/:id', children: [] }]),
        { provide: AnimalService, useValue: { getAll: vi.fn(getAll) } },
        { provide: SearchService, useValue: { getTop: vi.fn(() => of([])), record: vi.fn(() => of(undefined)) } },
      ],
    });
  }

  async function render() {
    const fixture = TestBed.createComponent(AnimalsList);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('starts with a saved position of zero', () => {
    configure();
    expect(TestBed.inject(AnimalListState).scrollY()).toBe(0);
  });

  it('saves the scroll position when a navigation starts', async () => {
    configure();
    await render();
    setScrollY(640);
    await TestBed.inject(Router).navigateByUrl('/animals/1');
    expect(TestBed.inject(AnimalListState).scrollY()).toBe(640);
  });

  it('scrolls back to the saved position after the animals are rendered', async () => {
    configure();
    TestBed.inject(AnimalListState).scrollY.set(800);
    await render();
    expect(scrollTo).toHaveBeenCalledWith(0, 800);
  });

  it('waits for the animals before scrolling back', async () => {
    const response = new Subject<Animal[]>();
    configure(() => response);
    TestBed.inject(AnimalListState).scrollY.set(800);
    const fixture = await render();
    expect(scrollTo).not.toHaveBeenCalledWith(0, 800);
    response.next(animals);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(scrollTo).toHaveBeenCalledWith(0, 800);
  });

  it('does not scroll back when loading fails', async () => {
    const response = new Subject<Animal[]>();
    configure(() => response);
    TestBed.inject(AnimalListState).scrollY.set(800);
    const fixture = await render();
    response.error(new Error('offline'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(scrollTo).not.toHaveBeenCalledWith(0, 800);
  });

  it('stops saving once the list is destroyed', async () => {
    configure();
    const fixture = await render();
    const state = TestBed.inject(AnimalListState);
    setScrollY(300);
    await TestBed.inject(Router).navigateByUrl('/animals/1');
    fixture.destroy();
    setScrollY(999);
    await TestBed.inject(Router).navigateByUrl('/animals/2');
    expect(state.scrollY()).toBe(300);
  });
});
