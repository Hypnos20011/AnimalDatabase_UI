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

describe('AnimalDetail hero layout', () => {
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
    const hero = () => element.querySelector('.hero') as HTMLElement;
    const loadPhoto = async (width: number, height: number) => {
      const img = element.querySelector('.hero-image') as HTMLImageElement;
      Object.defineProperty(img, 'naturalWidth', { configurable: true, value: width });
      Object.defineProperty(img, 'naturalHeight', { configurable: true, value: height });
      img.dispatchEvent(new Event('load'));
      await settle();
    };
    return { fixture, element, hero, loadPhoto, settle };
  }

  it('is pending with reserved space before the photo has loaded', async () => {
    const { hero } = await setup([photo]);

    expect(hero().dataset['layout']).toBe('pending');
    expect(hero().classList).not.toContain('no-photo');
  });

  it('overlays the name on a wide photo', async () => {
    const { hero, loadPhoto } = await setup([photo]);

    await loadPhoto(1280, 853);

    expect(hero().dataset['layout']).toBe('overlay');
  });

  it('places the name beside a portrait photo', async () => {
    const { fixture, hero, loadPhoto } = await setup([photo]);

    await loadPhoto(1000, 1348);

    expect(hero().dataset['layout']).toBe('side');
    expect(fixture.componentInstance.heroSize()).toEqual({ width: 1000, height: 1348 });
  });

  it('places the name beside a square photo', async () => {
    const { hero, loadPhoto } = await setup([photo]);

    await loadPhoto(900, 900);

    expect(hero().dataset['layout']).toBe('side');
  });

  it('falls back to the plain header when the photo fails to load', async () => {
    const { element, hero, settle } = await setup([photo]);

    element.querySelector('.hero-image')!.dispatchEvent(new Event('error'));
    await settle();

    expect(element.querySelector('.hero-image')).toBeNull();
    expect(hero().classList).toContain('no-photo');
    expect(hero().dataset['layout']).toBe('pending');
  });

  it('uses the plain header when the animal has no photos', async () => {
    const { element, hero } = await setup([]);

    expect(element.querySelector('.hero-image')).toBeNull();
    expect(hero().classList).toContain('no-photo');
  });

  it('resets the layout when another animal is loaded', async () => {
    const { fixture, hero, loadPhoto, settle } = await setup([photo]);
    await loadPhoto(1280, 853);

    fixture.componentRef.setInput('id', '3');
    await settle();

    expect(hero().dataset['layout']).toBe('pending');
  });

  it('hides the caption when it only repeats the name', async () => {
    const { element } = await setup([photo]);

    expect(element.querySelector('.hero-caption')).toBeNull();
  });

  it('shows a real caption inside the hero', async () => {
    const { element } = await setup([{ ...photo, caption: 'Okapi at Epulu' }]);

    expect(element.querySelector('.hero .hero-caption')?.textContent).toContain('Okapi at Epulu');
  });

  it('marks the intro with the layout so tall photos get the facts beside them', async () => {
    const { element, loadPhoto } = await setup([photo]);
    const intro = () => element.querySelector('.intro') as HTMLElement;

    expect(intro().dataset['layout']).toBe('pending');
    await loadPhoto(1000, 1348);
    expect(intro().dataset['layout']).toBe('side');
    await loadPhoto(1280, 853);
    expect(intro().dataset['layout']).toBe('overlay');
  });

  it('keeps the facts and the More details toggle together in the intro', async () => {
    const { element, settle } = await setup([photo]);
    const facts = element.querySelector('.intro .intro-facts') as HTMLElement;

    expect(facts.querySelector('.facts .fact dt')?.textContent).toContain('IUCN status');
    expect(facts.querySelector('.more')?.textContent).toContain('More details');

    (facts.querySelector('.more') as HTMLButtonElement).click();
    await settle();

    expect(facts.querySelector('.facts.extra')?.textContent).toContain('Giraffidae');
  });
});
