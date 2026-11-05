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

  it('translate posts to /translate', () => {
    const texts = { commonName: 'Okapi', habitat: null, rangeRegion: null, profile: null };
    service.translate(texts).subscribe();
    const req = http.expectOne(`${environment.apiUrl}/translate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(texts);
    req.flush({ commonName: 'Okapi', habitat: null, rangeRegion: null, profile: null });
  });

  it('getTranslation gets /animals/:id/translations/:language', () => {
    service.getTranslation(7, 'de').subscribe();
    const req = http.expectOne(`${url}/7/translations/de`);
    expect(req.request.method).toBe('GET');
    req.flush({ commonName: 'Okapi', habitat: null, rangeRegion: null, profile: null });
  });

  it('saveTranslation puts /animals/:id/translations/:language', () => {
    const texts = { commonName: 'Okapi', habitat: 'Regenwald', rangeRegion: null, profile: null };
    service.saveTranslation(7, 'de', texts).subscribe();
    const req = http.expectOne(`${url}/7/translations/de`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(texts);
    req.flush(null);
  });
});