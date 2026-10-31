import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StatsService } from './stats.service';
import { AnimalStats } from '../animal-model/animal-stats.model';
import { environment } from '../../environments/environment';

describe('StatsService.getStats', () => {
  let service: StatsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(StatsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('gets the stats from the stats endpoint', () => {
    service.getStats().subscribe();
    const request = http.expectOne(`${environment.apiUrl}/stats`);
    expect(request.request.method).toBe('GET');
    request.flush({});
  });

  it('returns the stats the API sends', () => {
    const stats: AnimalStats = {
      totalAnimals: 18,
      domesticatedAnimals: 2,
      byClass: { mammal: 9, fish: 2 },
      byIucnStatus: { LC: 4, unknown: 5 },
    };
    let received: AnimalStats | undefined;
    service.getStats().subscribe((result) => (received = result));
    http.expectOne(`${environment.apiUrl}/stats`).flush(stats);
    expect(received).toEqual(stats);
  });
});