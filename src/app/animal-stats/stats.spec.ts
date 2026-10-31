import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Stats } from './stats';
import { AnimalStats } from '../animal-model/animal-stats.model';
import { environment } from '../../environments/environment';

const sampleStats: AnimalStats = {
  totalAnimals: 18,
  domesticatedAnimals: 2,
  byClass: { mammal: 9, fish: 2 },
  byIucnStatus: { LC: 4, unknown: 5 },
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