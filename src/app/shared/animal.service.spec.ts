import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AnimalService } from './animal.service';
import { environment } from '../../environments/environment';

describe('AnimalService language', () => {
  let http: HttpTestingController;
  let service: AnimalService;
  const url = `${environment.apiUrl}/animals`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AnimalService);
  });

  afterEach(() => http.verify());

  it('getAll sends lang when a language is given', () => {
    service.getAll('de').subscribe();
    const req = http.expectOne((r) => r.url === url);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('lang')).toBe('de');
    req.flush([]);
  });

  it('getAll sends no lang without a language', () => {
    service.getAll().subscribe();
    const req = http.expectOne((r) => r.url === url);
    expect(req.request.params.has('lang')).toBe(false);
    expect(req.request.urlWithParams).toBe(url);
    req.flush([]);
  });

  it('getById sends lang when a language is given', () => {
    service.getById(7, 'en').subscribe();
    const req = http.expectOne((r) => r.url === `${url}/7`);
    expect(req.request.params.get('lang')).toBe('en');
    req.flush({});
  });

  it('getById sends no lang without a language so the edit form stays English', () => {
    service.getById(7).subscribe();
    const req = http.expectOne((r) => r.url === `${url}/7`);
    expect(req.request.params.has('lang')).toBe(false);
    expect(req.request.urlWithParams).toBe(`${url}/7`);
    req.flush({});
  });

  it('getImages does not send lang', () => {
    service.getImages(7).subscribe();
    const req = http.expectOne((r) => r.url === `${url}/7/images`);
    expect(req.request.params.keys().length).toBe(0);
    req.flush([]);
  });
});