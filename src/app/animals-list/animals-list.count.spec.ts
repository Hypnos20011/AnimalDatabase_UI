import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AnimalsList } from './animals-list';
import { AnimalService } from '../shared/animal.service';
import { SearchService } from './search.service';
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
    rangeRegion: null,
    profile: null,
    thumbnailUrl: null,
    createdAt: '2026-10-08T10:00:00',
    updatedAt: '2026-10-08T10:00:00',
  } as unknown as Animal;
}

describe('AnimalsList filter button count', () => {
  async function buttonText(animals: Animal[]) {
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
    const button = (fixture.nativeElement as HTMLElement).querySelector('.apply')!;
    return button.textContent!.trim();
  }

  it('says animal for one result', async () => {
    expect(await buttonText([animal(1, 'Okapi')])).toBe('Show 1 animal');
  });

  it('says animals for zero results', async () => {
    expect(await buttonText([])).toBe('Show 0 animals');
  });

  it('says animals for several results', async () => {
    expect(await buttonText([animal(1, 'Okapi'), animal(2, 'Tiger')])).toBe('Show 2 animals');
  });
});
