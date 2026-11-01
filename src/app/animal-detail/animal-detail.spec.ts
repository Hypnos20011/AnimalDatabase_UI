import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AnimalDetail } from './animal-detail';
import { AnimalService } from '../shared/animal.service';
import { Animal } from '../animal-model/animal.model';
import { AnimalImage } from '../animal-model/animal-image.model';
import { AdminKeyService } from '../admin/admin-key.service';
import { signal } from '@angular/core';

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
  habitatType: null,
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
      providers: [
        provideRouter([]),
        { provide: AnimalService, useValue: service },
        { provide: AdminKeyService, useValue: { unlocked: signal(true) } },
      ],
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
      providers: [
        provideRouter([]),
        { provide: AnimalService, useValue: service },
        { provide: AdminKeyService, useValue: { unlocked: signal(true) } },
      ],
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

describe('AnimalDetail while locked', () => {
  it('hides Edit and Delete but keeps Back', async () => {
    TestBed.configureTestingModule({
      imports: [AnimalDetail],
      providers: [
        provideRouter([]),
        {
          provide: AnimalService,
          useValue: { getById: vi.fn(() => of(okapi)), getImages: vi.fn(() => of([])) },
        },
        { provide: AdminKeyService, useValue: { unlocked: signal(false) } },
      ],
    });
    const fixture = TestBed.createComponent(AnimalDetail);
    fixture.componentRef.setInput('id', '2');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const actions = (fixture.nativeElement as HTMLElement).querySelector('.actions')!;

    expect(actions.querySelector('.edit')).toBeNull();
    expect(actions.querySelector('.delete')).toBeNull();
    expect(actions.querySelectorAll('a, button').length).toBeGreaterThan(0);
  });
});

describe('AnimalDetail facts', () => {
  async function setup(animal: Animal) {
    const service = {
      getById: vi.fn(() => of(animal)),
      getImages: vi.fn(() => of([])),
    };
    TestBed.configureTestingModule({
      imports: [AnimalDetail],
      providers: [
        provideRouter([]),
        { provide: AnimalService, useValue: service },
        { provide: AdminKeyService, useValue: { unlocked: signal(true) } },
      ],
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
    return { fixture, element, settle };
  }

  it('shows unknown when the lifespan is missing', async () => {
    const { element } = await setup({ ...okapi, lifespanYearsMin: null, lifespanYearsMax: null });

    const facts = element.querySelector('.facts')?.textContent;
    expect(facts).toContain('Unknown');
  });

  it('shows real lifespan', async () => {
    const { element } = await setup(okapi);

    const facts = element.querySelector('.facts')?.textContent;
    expect(facts).toContain('years');
    expect(facts).not.toContain('Unknown');
  });

  it('hides shoulder height when it is empty', async () => {
    const { element, settle } = await setup({ ...okapi, sizeHeightCmMin: null, sizeHeightCmMax: null });

    (element.querySelector('.more') as HTMLButtonElement).click();
    await settle();

    const extra = element.querySelector('.facts.extra')?.textContent;
    expect(extra).toContain('Body length');
    expect(extra).not.toContain('Shoulder height');
  });

  it('shows shoulder height when it is filled', async () => {
    const { element, settle } = await setup(okapi);

    (element.querySelector('.more') as HTMLButtonElement).click();
    await settle();

    const extra = element.querySelector('.facts.extra')?.textContent;
    expect(extra).toContain('Shoulder height');
    expect(extra).toContain('140');
  });
});

describe('AnimalDetail habitat', () => {
  async function setup(animal: Animal) {
    TestBed.configureTestingModule({
      imports: [AnimalDetail],
      providers: [
        provideRouter([]),
        {
          provide: AnimalService,
          useValue: { getById: vi.fn(() => of(animal)), getImages: vi.fn(() => of([])) },
        },
        { provide: AdminKeyService, useValue: { unlocked: signal(true) } },
      ],
    });
    const fixture = TestBed.createComponent(AnimalDetail);
    fixture.componentRef.setInput('id', '2');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const fact = (label: string) =>
      Array.from(element.querySelectorAll('.facts .fact'))
        .find((f) => f.querySelector('dt')?.textContent?.trim() === label)
        ?.querySelector('dd')
        ?.textContent?.trim();
    return { fact };
  }

  it('shows the habitat type and the full habitat text', async () => {
    const { fact } = await setup({
      ...okapi,
      habitatType: 'forest',
      habitat: 'Dense tropical rainforest',
    });
    expect(fact('Habitat type')).toBe('forest');
    expect(fact('Habitat')).toBe('Dense tropical rainforest');
  });

  it('keeps the habitat text when there is no habitat type', async () => {
    const { fact } = await setup({ ...okapi, habitat: 'Dense tropical rainforest' });
    expect(fact('Habitat type')).toBeUndefined();
    expect(fact('Habitat')).toBe('Dense tropical rainforest');
  });

  it('shows the habitat type when there is no habitat text', async () => {
    const { fact } = await setup({ ...okapi, habitatType: 'deep sea' });
    expect(fact('Habitat type')).toBe('deep sea');
    expect(fact('Habitat')).toBeUndefined();
  });
});