import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';
import { AnimalDetail } from './animal-detail';
import { Animal } from '../animal-model/animal.model';
import { AnimalImage } from '../animal-model/animal-image.model';
import { AnimalService } from '../shared/animal.service';
import { AdminKeyService, AdminRoleState } from '../admin/admin-key.service';
import { RecentlyViewedService } from '../animals-list/recently-viewed.service';
import { LanguageService } from '../shared/i18n/language.service';
import { animalStatusLabel } from '../shared/animal-status';

const animal = (status: 'approved' | 'pending' | 'rejected', submittedBy = 'tester'): Animal => ({
  id: 1,
  commonName: 'Okapi',
  scientificName: null,
  family: null,
  taxonomicClass: null,
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
  habitatType: null,
  rangeRegion: null,
  profile: null,
  sourceUrl: null,
  thumbnailUrl: null,
  createdAt: '',
  updatedAt: '',
  status,
  submittedBy,
  reviewedAt: null,
  reviewNote: 'Private review note',
} as Animal);

describe('AnimalDetail moderation', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  async function setup(current: Animal, role: AdminRoleState = 'admin') {
    const key = signal<string | null>(role === 'none' ? null : 'first');
    const roleSignal = signal<AdminRoleState>(role);
    const service = {
      getById: vi.fn(() => of(current)),
      getImages: vi.fn(() => of([] as AnimalImage[])),
      delete: vi.fn((): Observable<void> => of(undefined)),
    };
    TestBed.configureTestingModule({
      imports: [AnimalDetail],
      providers: [
        provideRouter([]),
        { provide: AnimalService, useValue: service },
        { provide: AdminKeyService, useValue: { key, role: roleSignal, unlocked: signal(role !== 'none') } },
      ],
    });
    const recent = vi.spyOn(TestBed.inject(RecentlyViewedService), 'record');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(AnimalDetail);
    fixture.componentRef.setInput('id', '1');
    const settle = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    await settle();
    return { fixture, detail: fixture.componentInstance, element: fixture.nativeElement as HTMLElement, key, roleSignal, service, recent, navigate, settle };
  }

  it.each([
    ['none', 'approved', 'tester', false, false],
    ['tester', 'approved', 'tester', false, false],
    ['tester', 'pending', 'tester', true, true],
    ['tester', 'pending', 'admin', true, false],
    ['tester', 'rejected', 'tester', false, false],
    ['admin', 'approved', 'admin', true, true],
    ['admin', 'pending', 'tester', true, true],
    ['admin', 'rejected', 'tester', true, true],
  ] as const)('applies %s permissions to %s submitted by %s', async (role, status, submitter, edit, del) => {
    const { element, detail, service } = await setup(animal(status, submitter), role);
    expect(!!element.querySelector('.edit')).toBe(edit);
    expect(!!element.querySelector('.delete')).toBe(del);
    if (!del) {
      detail.onDelete();
      detail.confirmDelete();
      expect(detail.confirmOpen()).toBe(false);
      expect(service.delete).not.toHaveBeenCalled();
    }
  });

  it.each(['pending', 'rejected'] as const)('shows an English %s badge and only admins see rejected review notes', async (status) => {
    const { element, roleSignal, settle } = await setup(animal(status));
    const i18n = TestBed.inject(LanguageService);
    expect(element.querySelector('.animal-status')?.textContent?.trim()).toBe(animalStatusLabel(status));
    expect(!!element.querySelector('.review-note')).toBe(status === 'rejected');
    roleSignal.set('tester');
    await settle();
    expect(element.querySelector('.review-note')).toBeNull();
    i18n.setLanguage('de');
    await settle();
    expect(element.querySelector('.animal-status')?.textContent?.trim()).toBe(animalStatusLabel(status));
  });

  it.each(['approved', 'pending', 'rejected'] as const)('only records public animals: %s', async (status) => {
    const { recent } = await setup(animal(status));
    expect(recent.mock.calls.length).toBe(status === 'approved' ? 1 : 0);
  });

  it('treats a legacy animal without status as public and shows no badge', async () => {
    const { element, recent } = await setup({ ...animal('approved'), status: undefined } as unknown as Animal);
    expect(element.querySelector('.animal-status')).toBeNull();
    expect(recent).toHaveBeenCalledOnce();
  });

  it('does not show an empty review note', async () => {
    const { element } = await setup({ ...animal('rejected'), reviewNote: '  ' });
    expect(element.querySelector('.review-note')).toBeNull();
  });

  it('clears and reloads animal and images on a key change, ignoring superseded responses', async () => {
    const { detail, key, service, recent, settle } = await setup(animal('approved'));
    const oldAnimal = new Subject<Animal>();
    const oldImages = new Subject<AnimalImage[]>();
    const newAnimal = new Subject<Animal>();
    const newImages = new Subject<AnimalImage[]>();
    service.getById.mockReturnValueOnce(oldAnimal).mockReturnValueOnce(newAnimal);
    service.getImages.mockReturnValueOnce(oldImages).mockReturnValueOnce(newImages);
    key.set('second');
    await settle();
    expect(detail.animal()).toBeNull();
    expect(detail.images()).toEqual([]);
    key.set(null);
    await settle();
    oldAnimal.next(animal('pending'));
    oldImages.next([{ id: 1, animalId: 1, url: 'old' } as AnimalImage]);
    expect(detail.animal()).toBeNull();
    expect(detail.images()).toEqual([]);
    newAnimal.next(animal('approved'));
    newImages.next([{ id: 2, animalId: 1, url: 'new' } as AnimalImage]);
    expect(detail.animal()?.status).toBe('approved');
    expect(detail.images()[0].url).toBe('new');
    expect(service.getById).toHaveBeenCalledTimes(3);
    expect(service.getImages).toHaveBeenCalledTimes(3);
    expect(recent).toHaveBeenCalledTimes(2);
  });

  it('ignores a response after the key changes even before the reload effect runs', async () => {
    const { key, service, recent, settle } = await setup(animal('approved'));
    const request = new Subject<Animal>();
    service.getById.mockReturnValueOnce(request);
    key.set('second');
    await settle();
    key.set(null);
    request.next(animal('approved'));
    expect(recent).toHaveBeenCalledTimes(1);
  });

  it('clears private data when a key change makes the animal inaccessible', async () => {
    const { detail, key, service, settle } = await setup(animal('rejected'));
    service.getById.mockReturnValueOnce(throwError(() => new Error('not found')));
    service.getImages.mockReturnValueOnce(throwError(() => new Error('not found')));
    key.set(null);
    await settle();
    expect(detail.animal()).toBeNull();
    expect(detail.images()).toEqual([]);
    expect(detail.loading()).toBe(false);
  });

  it('finishes loading when an invalid ID fails', async () => {
    const { fixture, detail, service, settle } = await setup(animal('approved'));
    service.getById.mockReturnValueOnce(throwError(() => new Error('not found')));
    fixture.componentRef.setInput('id', 'invalid');
    await settle();
    expect(detail.animal()).toBeNull();
    expect(detail.loading()).toBe(false);
  });

  it('ignores stale animal and image responses after an ID change', async () => {
    const { fixture, detail, service, settle } = await setup(animal('approved'));
    const oldAnimal = new Subject<Animal>();
    const oldImages = new Subject<AnimalImage[]>();
    service.getById.mockReturnValueOnce(oldAnimal);
    service.getImages.mockReturnValueOnce(oldImages);
    fixture.componentRef.setInput('id', '2');
    await settle();
    fixture.componentRef.setInput('id', '3');
    oldAnimal.next({ ...animal('approved'), id: 2 });
    oldImages.next([{ id: 1, animalId: 2, url: 'old' } as AnimalImage]);
    expect(detail.animal()).toBeNull();
    expect(detail.images()).toEqual([]);
    await settle();
    expect(service.getById).toHaveBeenCalledTimes(3);
    expect(service.getImages).toHaveBeenCalledTimes(3);
  });

  it('does not navigate or show errors from an old delete after the key changes', async () => {
    const { detail, key, service, navigate, fixture, settle } = await setup(animal('pending'));
    const deleting = new Subject<void>();
    service.delete.mockReturnValueOnce(deleting);
    detail.onDelete();
    detail.confirmDelete();
    key.set('second');
    await settle();
    deleting.next();
    expect(navigate).not.toHaveBeenCalled();
    expect(detail.confirmOpen()).toBe(false);
    expect(detail.deleting()).toBe(false);
    fixture.componentRef.setInput('id', '2');
    await settle();
    expect(detail.deleteError()).toBe('');
  });

  it('ignores an old delete error after an ID change', async () => {
    const { detail, service, fixture, settle } = await setup(animal('pending'));
    const deleting = new Subject<void>();
    service.delete.mockReturnValueOnce(deleting);
    detail.onDelete();
    detail.confirmDelete();
    fixture.componentRef.setInput('id', '2');
    deleting.error(new Error('offline'));
    await settle();
    expect(detail.deleteError()).toBe('');
    expect(detail.confirmOpen()).toBe(false);
    expect(detail.deleting()).toBe(false);
  });
});