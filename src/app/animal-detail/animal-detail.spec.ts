import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { AnimalDetail } from './animal-detail';
import { AnimalService } from '../animal.service';
import { Animal } from '../animal-model/animal.model';

type DialogShim = { showModal?: () => void; close?: () => void };

const okapi = {
  id: 2,
  commonName: 'Okapi',
  scientificName: 'Okapia johnstoni',
  family: 'Giraffidae',
  taxonomicClass: 'mammal',
  isDomesticated: false,
  sizeLengthCmMin: 180,
  sizeLengthCmMax: 250,
  sizeHeightCmMin: 140,
  sizeHeightCmMax: 170,
  weightKgMin: 200,
  weightKgMax: 350,
  lifespanYearsMin: 20,
  lifespanYearsMax: 30,
  iucnStatus: 'endangered',
  habitat: null,
  rangeRegion: null,
  profile: null,
  thumbnailUrl: null,
  createdAt: '2026-10-08T10:00:00',
  updatedAt: '2026-10-08T10:00:00',
} as Animal;

describe('AnimalDetail delete confirmation', () => {
  beforeAll(() => {
    const proto = HTMLDialogElement.prototype as unknown as DialogShim;
    proto.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    proto.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
  });

  async function setup(deleteResult: () => ReturnType<AnimalService['delete']>) {
    const service = {
      getById: vi.fn(() => of(okapi)),
      getImages: vi.fn(() => of([])),
      delete: vi.fn(deleteResult),
    };
    TestBed.configureTestingModule({
      imports: [AnimalDetail],
      providers: [provideRouter([]), { provide: AnimalService, useValue: service }],
    });
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(AnimalDetail);
    fixture.componentRef.setInput('id', '2');
    const element = fixture.nativeElement as HTMLElement;
    const settle = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    await settle();
    const query = <T extends HTMLElement>(selector: string) => element.querySelector(selector) as T;
    return { fixture, element, service, navigate, settle, query };
  }

  it('opens the dialog instead of deleting right away', async () => {
    const { service, settle, query } = await setup(() => of(undefined));

    query<HTMLButtonElement>('.actions .delete').click();
    await settle();

    expect(query<HTMLDialogElement>('dialog').open).toBe(true);
    expect(query('.confirm-title').textContent).toContain('Delete Okapi?');
    expect(query('.confirm-message').textContent).toContain('its pictures for good');
    expect(service.delete).not.toHaveBeenCalled();
  });

  it('cancel closes the dialog without calling the service', async () => {
    const { service, navigate, settle, query } = await setup(() => of(undefined));

    query<HTMLButtonElement>('.actions .delete').click();
    await settle();
    query<HTMLButtonElement>('.confirm-cancel').click();
    await settle();

    expect(query<HTMLDialogElement>('dialog').open).toBe(false);
    expect(service.delete).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('Escape closes the dialog without calling the service', async () => {
    const { service, settle, query } = await setup(() => of(undefined));

    query<HTMLButtonElement>('.actions .delete').click();
    await settle();
    query<HTMLDialogElement>('dialog').dispatchEvent(new Event('cancel', { cancelable: true }));
    await settle();

    expect(query<HTMLDialogElement>('dialog').open).toBe(false);
    expect(service.delete).not.toHaveBeenCalled();
  });

  it('confirm deletes the animal and goes back to the list', async () => {
    const { service, navigate, settle, query } = await setup(() => of(undefined));

    query<HTMLButtonElement>('.actions .delete').click();
    await settle();
    query<HTMLButtonElement>('.confirm-delete').click();
    await settle();

    expect(service.delete).toHaveBeenCalledTimes(1);
    expect(service.delete).toHaveBeenCalledWith(2);
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('shows a busy Delete button while the request runs', async () => {
    const pending = new Subject<void>();
    const { settle, query } = await setup(() => pending.asObservable());

    query<HTMLButtonElement>('.actions .delete').click();
    await settle();
    query<HTMLButtonElement>('.confirm-delete').click();
    await settle();

    const confirm = query<HTMLButtonElement>('.confirm-delete');
    expect(confirm.textContent?.trim()).toBe('Deleting...');
    expect(confirm.disabled).toBe(true);
    expect(query<HTMLButtonElement>('.confirm-cancel').disabled).toBe(true);
    pending.complete();
  });

  it('shows the error inside the dialog and stays on the page when delete fails', async () => {
    const { service, navigate, settle, query } = await setup(() =>
      throwError(() => new Error('offline')),
    );

    query<HTMLButtonElement>('.actions .delete').click();
    await settle();
    query<HTMLButtonElement>('.confirm-delete').click();
    await settle();

    expect(service.delete).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
    expect(query<HTMLDialogElement>('dialog').open).toBe(true);
    expect(query('.confirm-error').textContent).toContain('Could not delete this animal.');
    expect(query<HTMLButtonElement>('.confirm-delete').disabled).toBe(false);
  });
});
