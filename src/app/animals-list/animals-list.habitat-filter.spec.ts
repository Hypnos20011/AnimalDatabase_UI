import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AnimalsList } from './animals-list';
import { AnimalService } from '../shared/animal.service';
import { SearchService } from './search.service';
import { Animal } from '../animal-model/animal.model';

function animal(id: number, commonName: string, habitatType: string | null): Animal {
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
    habitatType,
    rangeRegion: null,
    profile: null,
    thumbnailUrl: null,
    createdAt: '2026-10-08T10:00:00',
    updatedAt: '2026-10-08T10:00:00',
  } as unknown as Animal;
}

const animals = [
  animal(1, 'Okapi', 'forest'),
  animal(2, 'Anglerfish', 'deep sea'),
  animal(3, 'Giraffe', 'grassland'),
  animal(4, 'Tapir', 'forest'),
  animal(5, 'Mystery', null),
];

describe('AnimalsList habitat filter', () => {
  async function setup() {
    TestBed.configureTestingModule({
      imports: [AnimalsList],
      providers: [
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

  function habitatChips(root: HTMLElement): HTMLButtonElement[] {
    const group = Array.from(root.querySelectorAll('.filter-chips')).find(
      (g) => g.querySelector('.chip-label')?.textContent?.trim() === 'Habitat:',
    );
    return Array.from(group?.querySelectorAll<HTMLButtonElement>('button.chip') ?? []);
  }

  function chipText(chip: HTMLButtonElement): string {
    return chip.textContent!.replace(/\s+/g, ' ').trim();
  }

  it('lists each habitat type once, sorted, without nulls', async () => {
    const fixture = await setup();
    expect(fixture.componentInstance.availableHabitats()).toEqual(['deep sea', 'forest', 'grassland']);
  });

  it('renders a chip per habitat with its label and count', async () => {
    const fixture = await setup();
    const chips = habitatChips(fixture.nativeElement as HTMLElement).map(chipText);
    expect(chips).toEqual(['Deep sea · 1', 'Forest · 2', 'Grassland · 1']);
  });

  it('filters the list to the selected habitat', async () => {
    const fixture = await setup();
    const forest = habitatChips(fixture.nativeElement as HTMLElement)[1];
    forest.click();
    fixture.detectChanges();
    const names = fixture.componentInstance.filteredAnimals().map((a) => a.commonName);
    expect(names).toEqual(['Okapi', 'Tapir']);
    expect(forest.classList.contains('active')).toBe(true);
  });

  it('combines several selected habitats', async () => {
    const fixture = await setup();
    const component = fixture.componentInstance;
    component.toggleHabitats('forest');
    component.toggleHabitats('deep sea');
    expect(component.filteredAnimals().map((a) => a.id).sort()).toEqual([1, 2, 4]);
  });

  it('removes a habitat when toggled twice', async () => {
    const fixture = await setup();
    const component = fixture.componentInstance;
    component.toggleHabitats('forest');
    component.toggleHabitats('forest');
    expect(component.isHabitatsActive('forest')).toBe(false);
    expect(component.filteredAnimals().length).toBe(5);
  });

  it('counts selected habitats in the active filter count', async () => {
    const fixture = await setup();
    const component = fixture.componentInstance;
    component.toggleHabitats('forest');
    component.toggleHabitats('grassland');
    expect(component.activeFilterCount()).toBe(2);
  });

  it('clears the habitat selection with clear all', async () => {
    const fixture = await setup();
    const component = fixture.componentInstance;
    component.toggleHabitats('forest');
    component.clearAll();
    expect(component.selectedHabitats().size).toBe(0);
    expect(component.filteredAnimals().length).toBe(5);
  });
});