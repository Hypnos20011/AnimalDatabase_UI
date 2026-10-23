import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SearchService } from './search.service';
import { environment } from '../environments/environment';

describe('SearchService.getTop', () => {
  let service: SearchService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SearchService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('asks for the last 30 days by default', () => {
    service.getTop().subscribe();
    const request = http.expectOne((req) => req.url === `${environment.apiUrl}/searches/top`);
    expect(request.request.params.get('limit')).toBe('5');
    expect(request.request.params.get('days')).toBe('30');
    request.flush([]);
  });

  it('passes the chosen window', () => {
    service.getTop(5, 7).subscribe();
    const request = http.expectOne((req) => req.url.endsWith('/searches/top'));
    expect(request.request.params.get('days')).toBe('7');
    request.flush([]);
  });

  it('sends days=0 for all time', () => {
    service.getTop(5, 0).subscribe();
    const request = http.expectOne((req) => req.url.endsWith('/searches/top'));
    expect(request.request.params.get('days')).toBe('0');
    request.flush([]);
  });
});
