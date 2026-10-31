import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AnimalsList } from './animals-list';
import { AnimalService } from '../shared/animal.service';
import { SearchService } from './search.service';
import { Animal } from '../animal-model/animal.model';

function animal(id: number, commonName: string, iucnStatus: string | null): Animal {
  return { id, commonName, taxonomicClass: 'mammal', isDomesticated: false, iucnStatus } as Animal;
}

describe('AnimalsList IUCN tooltip', () => {
  async function tooltips(animals: Animal[]) {
    TestBed.configureTestingModule({
      imports: [AnimalsList],
      providers: [
        provideRouter([]),
        { provide: AnimalService, useValue: { getAll: vi.fn(() => of(animals)) } },
        { provide: SearchService, useValue: { getTop: vi.fn(() => of([])), record: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(AnimalsList);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const codes = (fixture.nativeElement as HTMLElement).querySelectorAll('.code');
    return Array.from(codes).map((code) => code.getAttribute('title'));
  }

  it('explains the code with the full status', async () => {
    expect(await tooltips([animal(1, 'Okapi', 'endangered')])).toEqual(['endangered']);
  });

  it('says status unknown when there is no status', async () => {
    expect(await tooltips([animal(1, 'Dog', null)])).toEqual(['status unknown']);
  });
});