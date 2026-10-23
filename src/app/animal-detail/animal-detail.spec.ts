import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { AnimalDetail } from './animal-detail';
import { AnimalService } from '../animal.service';
import { Animal } from '../animal-model/animal.model';
import { AnimalImage } from '../animal-model/animal-image.model';

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

describe('AnimalDetail hero', () => {
  const photo = {
    id: 7,
    animalId: 2,
    url: 'https://upload.wikimedia.org/wikipedia/commons/9/9f/Okapia_johnstoni_17zz.jpg',
    caption: 'Okapi',
  } as AnimalImage;

  async function setup(images: AnimalImage[]) {
    const service = {
      getById: vi.fn(() => of(okapi)),
      getImages: vi.fn(() => of(images)),
      delete: vi.fn(() => of(undefined)),
    };
    TestBed.configureTestingModule({
      imports: [AnimalDetail],
      providers: [provideRouter([]), { provide: AnimalService, useValue: service }],
    });
    const fixture = TestBed.createComponent(AnimalDetail);
    fixture.componentRef.setInput('id', '2');
    const element = fixture.nativeElement as HTMLElement;
    const settle = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    await settle();
    const intro = () => element.querySelector('.intro') as HTMLElement;
    return { fixture, element, intro, settle };
  }

  it('uses the same layout for every photo, with the photo before the name and facts', async () => {
    const { element, intro } = await setup([photo]);

    expect(intro().classList).not.toContain('no-photo');
    expect(intro().dataset['layout']).toBeUndefined();
    expect(element.querySelector('.hero .hero-image')).not.toBeNull();
    expect(element.querySelector('.hero .detail-header')).toBeNull();
    const children = Array.from(intro().children).map((child) => child.className);
    expect(children).toEqual(['hero', 'intro-text']);
  });

  it('drops the photo area when the photo fails to load', async () => {
    const { element, intro, settle } = await setup([photo]);

    element.querySelector('.hero-image')!.dispatchEvent(new Event('error'));
    await settle();

    expect(element.querySelector('.hero')).toBeNull();
    expect(intro().classList).toContain('no-photo');
    expect(element.querySelector('.intro-text h2')?.textContent).toContain('Okapi');
  });

  it('drops the photo area when the animal has no photos', async () => {
    const { element, intro } = await setup([]);

    expect(element.querySelector('.hero')).toBeNull();
    expect(intro().classList).toContain('no-photo');
    expect(element.querySelector('.no-images')?.textContent).toContain('No images');
  });

  it('shows the photo again after loading another animal', async () => {
    const { fixture, element, settle } = await setup([photo]);
    element.querySelector('.hero-image')!.dispatchEvent(new Event('error'));
    await settle();

    fixture.componentRef.setInput('id', '3');
    await settle();

    expect(element.querySelector('.hero .hero-image')).not.toBeNull();
  });

  it('hides the caption when it only repeats the name', async () => {
    const { element } = await setup([photo]);

    expect(element.querySelector('.hero-caption')).toBeNull();
  });

  it('shows a real caption under the photo', async () => {
    const { element } = await setup([{ ...photo, caption: 'Okapi at Epulu' }]);

    expect(element.querySelector('.hero figcaption.hero-caption')?.textContent).toContain(
      'Okapi at Epulu',
    );
  });

  it('keeps the name, facts and More details together in the text column', async () => {
    const { element, settle } = await setup([photo]);
    const text = element.querySelector('.intro .intro-text') as HTMLElement;

    expect(text.querySelector('.detail-header h2')?.textContent).toContain('Okapi');
    expect(text.querySelector('.facts .fact dt')?.textContent).toContain('IUCN status');
    expect(text.querySelector('.more')?.textContent).toContain('More details');

    (text.querySelector('.more') as HTMLButtonElement).click();
    await settle();

    expect(text.querySelector('.facts.extra')?.textContent).toContain('Giraffidae');
  });
});
