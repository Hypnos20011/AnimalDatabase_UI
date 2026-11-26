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

  it('getTranslation gets /animals/:id/translations/:language', () => {
    service.getTranslation(7, 'de').subscribe();
    const req = http.expectOne(`${url}/7/translations/de`);
    expect(req.request.method).toBe('GET');
    req.flush({ commonName: 'Okapi', habitat: null, rangeRegion: null, profile: null });
  });

  it('missingTranslations gets the admin list', () => {
    service.missingTranslations().subscribe();
    const req = http.expectOne(`${environment.apiUrl}/admin/missing-translations`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('translateMissing posts to the animal endpoint', () => {
    service.translateMissing(4).subscribe();
    const req = http.expectOne(`${url}/4/translate-missing`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 4, commonName: 'Okapi', languages: [] });
  });

  it('gets the pending review list without a language', () => {
    service.pendingReview().subscribe((animals) => expect(animals).toEqual([]));
    const req = http.expectOne(`${environment.apiUrl}/admin/review/animals`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('lang')).toBe(false);
    req.flush([]);
  });

  it('posts an approval and handles an empty response', () => {
    let response: void | undefined;
    service.approve(7).subscribe((value) => (response = value));
    const req = http.expectOne(`${environment.apiUrl}/admin/review/animals/7/approve`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(response).toBeNull();
  });

  it('posts rejection notes, including an omitted note', () => {
    service.reject(7, '  Needs a source  ').subscribe();
    const withNote = http.expectOne(`${environment.apiUrl}/admin/review/animals/7/reject`);
    expect(withNote.request.method).toBe('POST');
    expect(withNote.request.body).toEqual({ note: 'Needs a source' });
    withNote.flush(null, { status: 204, statusText: 'No Content' });

    service.reject(8, '  ').subscribe();
    const withoutNote = http.expectOne(`${environment.apiUrl}/admin/review/animals/8/reject`);
    expect(withoutNote.request.method).toBe('POST');
    expect(withoutNote.request.body).toBeNull();
    withoutNote.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('propagates review errors to the caller', () => {
    let status = 0;
    service.approve(7).subscribe({ error: (error) => (status = error.status) });
    const req = http.expectOne(`${environment.apiUrl}/admin/review/animals/7/approve`);
    req.flush(null, { status: 409, statusText: 'Conflict' });
    expect(status).toBe(409);
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
