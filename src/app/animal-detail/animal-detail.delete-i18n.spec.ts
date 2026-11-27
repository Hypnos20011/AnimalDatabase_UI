import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { AnimalDetail } from './animal-detail';
import { AnimalService } from '../shared/animal.service';
import { Animal } from '../animal-model/animal.model';
import { AdminKeyService } from '../admin/admin-key.service';
import { en } from '../shared/i18n/en';
import { de } from '../shared/i18n/de';
import { fr } from '../shared/i18n/fr';

type DialogShim = { showModal?: () => void; close?: () => void };

const okapi = {
  id: 2,
  commonName: 'Okapi',
  scientificName: 'Okapia johnstoni',
  family: 'Giraffidae',
  taxonomicClass: 'mammal',
  isDomesticated: false,
  lengthMmMin: null,
  lengthMmMax: null,
  heightMmMin: null,
  heightMmMax: null,
  weightGramsMin: null,
  weightGramsMax: null,
  lifespanMonthsMin: null,
  lifespanMonthsMax: null,
  iucnStatus: 'endangered',
  habitat: null,
  habitatType: null,
  rangeRegion: null,
  profile: null,
  thumbnailUrl: null,
  createdAt: '2026-10-08T10:00:00',
  updatedAt: '2026-10-08T10:00:00',
} as Animal;

describe('AnimalDetail admin Edit/Delete i18n', () => {
  beforeAll(() => {
    const proto = HTMLDialogElement.prototype as unknown as DialogShim;
    proto.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    proto.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
  });

  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  async function setup(role: 'admin' | 'tester' = 'admin') {
    TestBed.configureTestingModule({
      imports: [AnimalDetail],
      providers: [
        provideRouter([]),
        {
          provide: AnimalService,
          useValue: {
            getById: vi.fn(() => of(okapi)),
            getImages: vi.fn(() => of([])),
            delete: vi.fn(() => of(undefined)),
          },
        },
        {
          provide: AdminKeyService,
          useValue: { key: signal('key'), unlocked: signal(true), role: signal(role) },
        },
      ],
    });
    const fixture = TestBed.createComponent(AnimalDetail);
    fixture.componentRef.setInput('id', '2');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const settle = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    const query = <T extends HTMLElement>(selector: string) => element.querySelector(selector) as T;
    return { fixture, element, settle, query };
  }

  it('has Edit/Delete keys in EN, DE and FR', () => {
    const keys = [
      'detail.edit',
      'detail.delete',
      'detail.delete.title',
      'detail.delete.thisAnimal',
      'detail.delete.message',
      'detail.delete.busy',
      'detail.delete.error',
      'admin.accessDenied',
    ] as const;
    for (const key of keys) {
      expect(en[key].length).toBeGreaterThan(0);
      expect(de[key].length).toBeGreaterThan(0);
      expect(fr[key].length).toBeGreaterThan(0);
      expect(de[key]).not.toBe(en[key]);
      expect(fr[key]).not.toBe(en[key]);
    }
  });

  it('shows English Edit and Delete for admins by default', async () => {
    const { query } = await setup();
    expect(query('.actions .edit').textContent!.trim()).toBe('Edit');
    expect(query('.actions .delete').textContent!.trim()).toBe('Delete');
  });

  it('hides Edit and Delete for testers on legacy public animals', async () => {
    const { element } = await setup('tester');

    expect(element.querySelector('.actions .edit')).toBeNull();
    expect(element.querySelector('.actions .delete')).toBeNull();
    expect(element.querySelector('app-confirm-dialog')).toBeNull();
  });

  it('opens the English delete confirmation dialog', async () => {
    const { settle, query } = await setup();
    query<HTMLButtonElement>('.actions .delete').click();
    await settle();
    expect(query('.confirm-title').textContent!.trim()).toBe('Delete Okapi?');
    expect(query('.confirm-message').textContent).toContain('Top searches');
    expect(query('.confirm-delete').textContent!.trim()).toBe('Delete');
  });

  it('uses German Edit, Delete and dialog copy', async () => {
    localStorage.setItem('language', 'de');
    const { settle, query } = await setup();
    expect(query('.actions .edit').textContent!.trim()).toBe('Bearbeiten');
    expect(query('.actions .delete').textContent!.trim()).toBe('Löschen');
    query<HTMLButtonElement>('.actions .delete').click();
    await settle();
    expect(query('.confirm-title').textContent!.trim()).toBe('Okapi löschen?');
    expect(query('.confirm-message').textContent).toContain('Meistgesucht');
    expect(query('.confirm-delete').textContent!.trim()).toBe('Löschen');
  });

  it('uses French Edit, Delete and dialog copy', async () => {
    localStorage.setItem('language', 'fr');
    const { settle, query } = await setup();
    expect(query('.actions .edit').textContent!.trim()).toBe('Modifier');
    expect(query('.actions .delete').textContent!.trim()).toBe('Supprimer');
    query<HTMLButtonElement>('.actions .delete').click();
    await settle();
    expect(query('.confirm-title').textContent!.trim()).toBe('Supprimer Okapi ?');
    expect(query('.confirm-message').textContent).toContain('recherches populaires');
    expect(query('.confirm-delete').textContent!.trim()).toBe('Supprimer');
  });
});
