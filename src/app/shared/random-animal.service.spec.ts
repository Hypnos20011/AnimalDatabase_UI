import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { RandomAnimalService, pickRandom } from './random-animal.service';
import { AnimalService } from './animal.service';
import { AnimalListState } from '../animals-list/animal-list-state';
import { Animal } from '../animal-model/animal.model';
import { LanguageService } from './i18n/language.service';

describe('pickRandom', () => {
  it('returns null for an empty pool', () => {
    expect(pickRandom([])).toBeNull();
  });

  it('maps the random number onto the pool', () => {
    expect(pickRandom([3, 5, 8], () => 0)).toBe(3);
    expect(pickRandom([3, 5, 8], () => 0.5)).toBe(5);
    expect(pickRandom([3, 5, 8], () => 0.9999)).toBe(8);
  });
});

describe('RandomAnimalService', () => {
  afterEach(() => {
    TestBed.inject(LanguageService).setLanguage('en');
    localStorage.removeItem('language');
  });

  function setup(all: Partial<Animal>[]) {
    const getAll = vi.fn(() => of(all as Animal[]));
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AnimalService, useValue: { getAll } }],
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    return { service: TestBed.inject(RandomAnimalService), getAll, navigate };
  }

  it('picks from the pool the list page shares', () => {
    const { service, getAll, navigate } = setup([]);
    TestBed.inject(AnimalListState).randomPool.set([7]);

    service.open();

    expect(navigate).toHaveBeenCalledWith(['/animals', 7]);
    expect(getAll).not.toHaveBeenCalled();
  });

  it('loads all animals in the current language when the list page has not shared a pool yet', () => {
    const { service, getAll, navigate } = setup([{ id: 12 }]);
    TestBed.inject(LanguageService).setLanguage('fr');

    service.open();

    expect(getAll).toHaveBeenCalledTimes(1);
    expect(getAll).toHaveBeenCalledWith('fr');
    expect(navigate).toHaveBeenCalledWith(['/animals', 12]);
  });

  it('does nothing when there are no animals', () => {
    const { service, navigate } = setup([]);

    service.open();

    expect(navigate).not.toHaveBeenCalled();
  });
});
