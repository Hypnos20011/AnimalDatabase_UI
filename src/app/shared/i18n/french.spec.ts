import { TestBed } from '@angular/core/testing';
import { formatDate } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { appConfig } from '../../app.config';
import { AnimalService } from '../animal.service';
import { formatNumber } from '../format-range';
import { LanguageService } from './language.service';
import { isLanguage, SUPPORTED_LANGUAGES } from './languages';

describe('French', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('is a supported language', () => {
    expect(SUPPORTED_LANGUAGES).toContain('fr');
    expect(isLanguage('fr')).toBe(true);
  });

  it('returns French UI text when French is stored', () => {
    localStorage.setItem('language', 'fr');
    const i18n = TestBed.inject(LanguageService);
    expect(i18n.t('nav.stats')).toBe('Statistiques');
    expect(i18n.t('form.save')).not.toBe('Save');
  });

  it('switches to French and sets the html lang', () => {
    const i18n = TestBed.inject(LanguageService);
    i18n.setLanguage('fr');
    expect(i18n.t('detail.back')).toBe('Retour à la liste');
    expect(document.documentElement.lang).toBe('fr');
    expect(localStorage.getItem('language')).toBe('fr');
  });

  it('uses French plural rules', () => {
    localStorage.setItem('language', 'fr');
    const i18n = TestBed.inject(LanguageService);
    expect(i18n.tPlural('list.count', 0)).toBe('0 animal');
    expect(i18n.tPlural('list.count', 1)).toBe('1 animal');
    expect(i18n.tPlural('list.count', 2)).toBe('2 animaux');
    expect(i18n.tPlural('list.count', 1000000)).toBe('1000000 animaux');
  });

  it('translates class, habitat and IUCN values', () => {
    localStorage.setItem('language', 'fr');
    const i18n = TestBed.inject(LanguageService);
    expect(i18n.tValue('class', 'bird')).toBe('Oiseau');
    expect(i18n.tValue('habitat', 'deep sea')).toBe('Grands fonds');
    expect(i18n.tValue('iucn', 'endangered')).toBe('En danger');
  });

  it('has the French locale registered for dates and numbers', () => {
    expect(appConfig).toBeTruthy();
    expect(formatDate('2026-11-05', 'longDate', 'fr')).toBe('5 novembre 2026');
    expect(formatNumber(1.5, 1, 'fr')).toBe('1,5');
  });

  it('asks the API for French animal texts', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const service = TestBed.inject(AnimalService);
    const http = TestBed.inject(HttpTestingController);
    service.getAll('fr').subscribe();
    const request = http.expectOne((req) => req.url.endsWith('/animals'));
    expect(request.request.params.get('lang')).toBe('fr');
    request.flush([]);
    http.verify();
  });
});
