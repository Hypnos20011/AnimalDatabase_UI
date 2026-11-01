import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AnimalForm } from './animal-form';
import { AnimalService } from '../shared/animal.service';
import { WikipediaImport } from '../animal-model/wikipedia-import.model';
import { Animal } from '../animal-model/animal.model';
import { it } from 'vitest';

function shoebill(overrides: Partial<WikipediaImport> = {}): WikipediaImport {
  return {
    commonName: 'Shoebill',
    scientificName: 'Balaeniceps rex',
    family: 'Balaenicipitidae',
    taxonomicClass: 'bird',
    sizeLengthCmMin: 100,
    sizeLengthCmMax: 140,
    weightKgMin: 4,
    weightKgMax: 7,
    lifespanYearsMin: null,
    lifespanYearsMax: null,
    iucnStatus: 'vulnerable',
    habitat: 'Freshwater swamps',
    rangeRegion: 'Central tropical Africa',
    profile: 'The shoebill is a large long-legged wading bird.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Shoebill.jpg',
    sourceUrl: 'https://en.wikipedia.org/wiki/Shoebill',
    warnings: [],
    ...overrides,
  };
}

describe('AnimalForm Wikipedia lookup', () => {
  function setup(data: WikipediaImport) {
    TestBed.configureTestingModule({
      imports: [AnimalForm],
      providers: [
        provideRouter([]),
        {
          provide: AnimalService,
          useValue: {
            getAll: vi.fn(() => of([])),
            importFromWikipedia: vi.fn(() => of(data)),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(AnimalForm);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('fills habitat and range from the lookup', () => {
    const form = setup(shoebill());
    form.wikiUrl.set('Shoebill');
    form.importFromWikipedia();
    expect(form.form.controls.habitat.value).toBe('Freshwater swamps');
    expect(form.form.controls.rangeRegion.value).toBe('Central tropical Africa');
    expect(form.importMessage()).toContain('Filled in 13 fields');
  });

  it('keeps typed habitat and range when the lookup has none', () => {
    const form = setup(shoebill({ habitat: null, rangeRegion: '' }));
    form.form.controls.habitat.setValue('Papyrus marshes');
    form.form.controls.rangeRegion.setValue('South Sudan');
    form.wikiUrl.set('Shoebill');
    form.importFromWikipedia();
    expect(form.form.controls.habitat.value).toBe('Papyrus marshes');
    expect(form.form.controls.rangeRegion.value).toBe('South Sudan');
    expect(form.importMessage()).toContain('Filled in 11 fields');
  });
});

describe('AnimalForm repeated Wikipedia lookups', () => {
  const catPicture = 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Cat.jpg';
  const octopusPicture = 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Octopus.jpg';

  function setup(...results: WikipediaImport[]) {
    const lookup = vi.fn();
    for (const result of results) lookup.mockReturnValueOnce(of(result));
    TestBed.configureTestingModule({
      imports: [AnimalForm],
      providers: [
        provideRouter([]),
        {
          provide: AnimalService,
          useValue: { getAll: vi.fn(() => of([])), importFromWikipedia: lookup },
        },
      ],
    });
    const fixture = TestBed.createComponent(AnimalForm);
    fixture.detectChanges();
    return { fixture, form: fixture.componentInstance };
  }

  function lookUp(form: AnimalForm, query: string) {
    form.wikiUrl.set(query);
    form.importFromWikipedia();
  }

  it('replaces the picture from an earlier lookup', () => {
    const { fixture, form } = setup(
      shoebill({ commonName: 'Cat', imageUrl: catPicture }),
      shoebill({ commonName: 'Blue-ringed octopus', imageUrl: octopusPicture }),
    );
    lookUp(form, 'cat');
    form.markPreviewFailed(octopusPicture);
    lookUp(form, 'blue-ringed octopus');
    fixture.detectChanges();
    expect(form.form.controls.commonName.value).toBe('Blue-ringed octopus');
    expect(form.form.controls.otherImageUrl.value).toBe(octopusPicture);
    expect(form.previewFailed(octopusPicture)).toBe(false);
    const preview = (fixture.nativeElement as HTMLElement).querySelector('img.preview');
    expect(preview?.getAttribute('src')).toBe(octopusPicture);
  });

  it('clears the earlier picture when the new lookup has none', () => {
    const { form } = setup(shoebill({ imageUrl: catPicture }), shoebill({ imageUrl: null }));
    lookUp(form, 'cat');
    lookUp(form, 'blue-ringed octopus');
    expect(form.form.controls.otherImageUrl.value).toBe('');
  });

  it('keeps a picture the user entered', () => {
    const own = 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Own.jpg';
    const { form } = setup(
      shoebill({ imageUrl: catPicture }),
      shoebill({ imageUrl: octopusPicture }),
    );
    form.form.controls.otherImageUrl.setValue(own);
    lookUp(form, 'cat');
    expect(form.form.controls.otherImageUrl.value).toBe(own);
    lookUp(form, 'blue-ringed octopus');
    expect(form.form.controls.otherImageUrl.value).toBe(own);
  });

  it('clears values left over from the earlier lookup', () => {
    const { form } = setup(
      shoebill({
        commonName: 'Cat',
        lifespanYearsMin: 12,
        lifespanYearsMax: 15,
        rangeRegion: 'Much of the world',
      }),
      shoebill({
        commonName: 'Blue-ringed octopus',
        lifespanYearsMin: null,
        lifespanYearsMax: null,
        rangeRegion: null,
      }),
    );
    lookUp(form, 'cat');
    lookUp(form, 'blue-ringed octopus');
    expect(form.form.controls.lifespanYearsMin.value).toBeNull();
    expect(form.form.controls.lifespanYearsMax.value).toBeNull();
    expect(form.form.controls.rangeRegion.value).toBe('');
  });

  it('keeps a value the user changed after the earlier lookup', () => {
    const { form } = setup(
      shoebill({ rangeRegion: 'Much of the world', lifespanYearsMax: 15 }),
      shoebill({ rangeRegion: null, lifespanYearsMax: null }),
    );
    lookUp(form, 'cat');
    form.form.controls.rangeRegion.setValue('Indo-Pacific');
    form.form.controls.lifespanYearsMax.setValue(2);
    lookUp(form, 'blue-ringed octopus');
    expect(form.form.controls.rangeRegion.value).toBe('Indo-Pacific');
    expect(form.form.controls.lifespanYearsMax.value).toBe(2);
  });
});

describe('AnimalForm lookup rate limit', () => {
  function setup(error: HttpErrorResponse) {
    TestBed.configureTestingModule({
      imports: [AnimalForm],
      providers: [
        provideRouter([]),
        {
          provide: AnimalService,
          useValue: {
            getAll: vi.fn(() => of([])),
            importFromWikipedia: vi.fn(() => throwError(() => error)),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(AnimalForm);
    fixture.detectChanges();
    return fixture;
  }

  it('shows a short inline message after too many lookups', () => {
    const fixture = setup(new HttpErrorResponse({ status: 429, error: 'Too many requests.' }));
    const form = fixture.componentInstance;
    form.wikiUrl.set('Shoebill');
    form.importFromWikipedia();
    fixture.detectChanges();

    expect(form.importError()).toBe('Too many lookups. Try again in a minute.');
    expect(form.importing()).toBe(false);
    const message = (fixture.nativeElement as HTMLElement).querySelector('.field-error');
    expect(message?.textContent?.trim()).toBe('Too many lookups. Try again in a minute.');
  });

  it('uses a short server wait when one is given', () => {
    const fixture = setup(
      new HttpErrorResponse({
        status: 429,
        headers: new HttpHeaders({ 'Retry-After': '20' }),
      }),
    );
    const form = fixture.componentInstance;
    form.wikiUrl.set('Shoebill');
    form.importFromWikipedia();

    expect(form.importError()).toBe('Too many lookups. Try again in 20 seconds.');
  });

  it('still shows the server message for other lookup errors', () => {
    const fixture = setup(
      new HttpErrorResponse({ status: 400, error: "That isn't a Wikipedia article link." }),
    );
    const form = fixture.componentInstance;
    form.wikiUrl.set('https://example.org');
    form.importFromWikipedia();

    expect(form.importError()).toBe("That isn't a Wikipedia article link.");
  });
});

describe('AnimalForm lookup', () => {
  const boxerCrab = {
    id: 1,
    commonName: 'Boxer Crab',
    scientificName: 'Lybia tessellata',
  } as Animal;
  const boxerCrabPicture =
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/16/Lybia_tessellata.jpg/1280px-Lybia_tessellata.jpg';
  const hornwormPicture =
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0b/Manduca_quinquemaculata_MHNT_CUT_2010_0_116_Schuylkill_Haven%2C_Schuylkill_Co._Penna_male_dorsal.jpg/1280px-Manduca_quinquemaculata_MHNT_CUT_2010_0_116_Schuylkill_Haven%2C_Schuylkill_Co._Penna_male_dorsal.jpg';

  function setup(...results: WikipediaImport[]) {
    const lookup = vi.fn();
    for (const result of results) lookup.mockReturnValueOnce(of(result));
    TestBed.configureTestingModule({
      imports: [AnimalForm],
      providers: [
        provideRouter([]),
        {
          provide: AnimalService,
          useValue: {
            getAll: vi.fn(() => of([])),
            importFromWikipedia: lookup,
            getById: vi.fn(() => of(boxerCrab)),
            getImages: vi.fn(() =>
              of([{ kind: 'unspecified', url: boxerCrabPicture, caption: 'Other' }]),
            ),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(AnimalForm);
    fixture.componentRef.setInput('id', '1');
    fixture.detectChanges();
    return { fixture, form: fixture.componentInstance };
  }

  function lookUp(form: AnimalForm, query: string) {
    form.wikiUrl.set(query);
    form.importFromWikipedia();
  }

  it('replaces the saved picture when a different animal is filled in', () => {
    const { form } = setup(
      shoebill({ imageUrl: hornwormPicture, scientificName: 'Manduca sexta' }),
    );
    lookUp(form, 'hornworm');
    expect(form.form.controls.otherImageUrl.value).toBe(hornwormPicture);
  });

  it('keeps the saved picture when the same animal is filled in again', () => {
    const { form } = setup(
      shoebill({imageUrl: hornwormPicture, scientificName: boxerCrab.scientificName }),
    );
    lookUp(form, 'boxer crab');
    expect(form.form.controls.otherImageUrl.value).toBe(boxerCrabPicture);
  });
});

describe('AnimalForm source warnings', () => {
  const lengthWarning = 'Length: AnAge says 50, kept 20 - 30';
  const weightWarning = 'Weight: EOL says 20 - 25, kept 5 - 8';

  function setup(...results: WikipediaImport[]) {
    const lookup = vi.fn();
    for (const result of results) lookup.mockReturnValueOnce(of(result));
    TestBed.configureTestingModule({
      imports: [AnimalForm],
      providers: [
        provideRouter([]),
        {
          provide: AnimalService,
          useValue: { getAll: vi.fn(() => of([])), importFromWikipedia: lookup },
        },
      ],
    });
    const fixture = TestBed.createComponent(AnimalForm);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    function lookUp(query: string) {
      fixture.componentInstance.wikiUrl.set(query);
      fixture.componentInstance.importFromWikipedia();
      fixture.detectChanges();
    }
    function shownWarnings() {
      return Array.from(element.querySelectorAll('.import-warnings li')).map((item) =>
        item.textContent?.trim(),
      );
    }
    return { element, lookUp, shownWarnings };
  }

  it('shows each warning text from the lookup', () => {
    const { lookUp, shownWarnings } = setup(shoebill({ warnings: [lengthWarning, weightWarning] }));
    lookUp('Shoebill');
    expect(shownWarnings()).toEqual([lengthWarning, weightWarning]);
  });

  it('shows no warning list when the sources agree', () => {
    const { element, lookUp } = setup(shoebill());
    lookUp('Shoebill');
    expect(element.querySelector('.import-warnings')).toBeNull();
  });

  it('clears old warnings when the next lookup has none', () => {
    const { element, lookUp } = setup(shoebill({ warnings: [lengthWarning] }), shoebill());
    lookUp('Shoebill');
    lookUp('Shoebill');
    expect(element.querySelector('.import-warnings')).toBeNull();
  });

  it('replaces old warnings with the new ones', () => {
    const { lookUp, shownWarnings } = setup(
      shoebill({ warnings: [lengthWarning] }),
      shoebill({ warnings: [weightWarning] }),
    );
    lookUp('Shoebill');
    lookUp('Shoebill');
    expect(shownWarnings()).toEqual([weightWarning]);
  });
});

describe('AnimalForm domesticated animals', () => {
  const dog = { id: 2, commonName: 'Dog', isDomesticated: true, iucnStatus: null } as Animal;

  function setup(id?: string) {
    const create = vi.fn(() => of(dog));
    TestBed.configureTestingModule({
      imports: [AnimalForm],
      providers: [
        provideRouter([]),
        {
          provide: AnimalService,
          useValue: {
            getAll: vi.fn(() => of([])),
            getById: vi.fn(() => of(dog)),
            getImages: vi.fn(() => of([])),
            create,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(AnimalForm);
    if (id) fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
    const form = fixture.componentInstance;
    const iucnSelect = (): HTMLSelectElement =>
      fixture.nativeElement.querySelector('select[formControlName="iucnStatus"]');
    return { fixture, form, create, iucnSelect };
  }

  it('clears and locks the IUCN status when domesticated is ticked', () => {
    const { fixture, form, iucnSelect } = setup();
    form.form.controls.iucnStatus.setValue('vulnerable');
    form.form.controls.isDomesticated.setValue(true);
    fixture.detectChanges();
    expect(form.form.controls.iucnStatus.value).toBe('');
    expect(iucnSelect().disabled).toBe(true);
  });

  it('unlocks the IUCN status when domesticated is unticked', () => {
    const { fixture, form, iucnSelect } = setup();
    form.form.controls.isDomesticated.setValue(true);
    form.form.controls.isDomesticated.setValue(false);
    fixture.detectChanges();
    expect(iucnSelect().disabled).toBe(false);
  });

  it('saves no IUCN status for a domesticated animal', () => {
    const { form, create } = setup();
    form.form.controls.commonName.setValue('Dog');
    form.form.controls.iucnStatus.setValue('vulnerable');
    form.form.controls.isDomesticated.setValue(true);
    form.submit();
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ iucnStatus: null }));
  });

  it('locks the IUCN status when editing a domesticated animal', () => {
    const { fixture, iucnSelect } = setup('2');
    fixture.detectChanges();
    expect(iucnSelect().disabled).toBe(true);
  });
});

describe('AnimalForm habitat type', () => {
  const okapi = { id: 3, commonName: 'Okapi', isDomesticated: false, habitatType: 'forest' } as Animal;

  function setup(id?: string) {
    const create = vi.fn(() => of(okapi));
    TestBed.configureTestingModule({
      imports: [AnimalForm],
      providers: [
        provideRouter([]),
        {
          provide: AnimalService,
          useValue: {
            getAll: vi.fn(() => of([])),
            getById: vi.fn(() => of(okapi)),
            getImages: vi.fn(() => of([])),
            create,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(AnimalForm);
    if (id) fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
    const form = fixture.componentInstance;
    const habitatSelect = (): HTMLSelectElement =>
      fixture.nativeElement.querySelector('select[formControlName="habitatType"]');
    return { fixture, form, create, habitatSelect };
  }

  it('offers Unknown and every habitat type', () => {
    const { habitatSelect } = setup();
    const options = Array.from(habitatSelect().options).map((option) => option.value);
    expect(options).toEqual([
      '',
      'forest',
      'grassland',
      'desert',
      'mountains',
      'wetland',
      'freshwater',
      'ocean',
      'deep sea',
      'underground',
    ]);
  });

  it('starts as Unknown for a new animal', () => {
    const { form } = setup();
    expect(form.form.controls.habitatType.value).toBe('');
  });

  it('saves the chosen habitat type', () => {
    const { form, create } = setup();
    form.form.controls.commonName.setValue('Okapi');
    form.form.controls.habitatType.setValue('deep sea');
    form.submit();
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ habitatType: 'deep sea' }));
  });

  it('saves no habitat type when Unknown is chosen', () => {
    const { form, create } = setup();
    form.form.controls.commonName.setValue('Okapi');
    form.submit();
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ habitatType: null }));
  });

  it('shows the saved habitat type when editing', () => {
    const { fixture, form, habitatSelect } = setup('3');
    fixture.detectChanges();
    expect(form.form.controls.habitatType.value).toBe('forest');
    expect(habitatSelect().value).toBe('forest');
  });
});