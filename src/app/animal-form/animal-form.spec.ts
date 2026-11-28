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
    lengthMmMin: 1000,
    lengthMmMax: 1400,
    heightMmMin: null,
    heightMmMax: null,
    weightGramsMin: 4000,
    weightGramsMax: 7000,
    lifespanMonthsMin: null,
    lifespanMonthsMax: null,
    iucnStatus: 'vulnerable',
    habitat: 'Freshwater swamps',
    rangeRegion: 'Central tropical Africa',
    profile: 'The shoebill is a large long-legged wading bird.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Shoebill.jpg',
    attribution: 'Charles J. Sharp / CC BY-SA 4.0',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Shoebill.jpg',
    sourceUrl: 'https://en.wikipedia.org/wiki/Shoebill',
    warnings: [],
    ...overrides,
  };
}

const emptyMeasurements = {
  lengthMmMin: null,
  lengthMmMax: null,
  heightMmMin: null,
  heightMmMax: null,
  weightGramsMin: null,
  weightGramsMax: null,
  lifespanMonthsMin: null,
  lifespanMonthsMax: null,
};

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
    expect(form.importMessage()).toContain('Filled in 15 fields');
  });

  it('fills canonical measurements including height in appropriate display units', () => {
    const form = setup(shoebill({
      lengthMmMin: 1000,
      lengthMmMax: 1400,
      heightMmMin: 500,
      heightMmMax: 800,
      weightGramsMin: 2,
      weightGramsMax: 5,
      lifespanMonthsMin: 6,
      lifespanMonthsMax: 18,
    }));
    form.wikiUrl.set('Shoebill');
    form.importFromWikipedia();
    expect(form.form.getRawValue()).toEqual(expect.objectContaining({
      lengthMin: 1, lengthMax: 1.4, lengthUnit: 'm',
      heightMin: 50, heightMax: 80, heightUnit: 'cm',
      weightMin: 2, weightMax: 5, weightUnit: 'g',
      lifespanMin: 6, lifespanMax: 18, lifespanUnit: 'month',
    }));
    expect(form.importMessage()).toContain('Filled in 19 fields');
  });
  it('fills image credit fields from the lookup', () => {
    const form = setup(shoebill());
    form.wikiUrl.set('Shoebill');
    form.importFromWikipedia();
    const image = form.imageRows.at(0);
    expect(image.get('url')?.value).toBe(
      'https://upload.wikimedia.org/wikipedia/commons/a/a1/Shoebill.jpg',
    );
    expect(image.get('attribution')?.value).toBe('Charles J. Sharp / CC BY-SA 4.0');
    expect(image.get('sourcePageUrl')?.value).toBe(
      'https://commons.wikimedia.org/wiki/File:Shoebill.jpg',
    );
  });

  it('keeps typed habitat and range when the lookup has none', () => {
    const form = setup(shoebill({ habitat: null, rangeRegion: '' }));
    form.form.controls.habitat.setValue('Papyrus marshes');
    form.form.controls.rangeRegion.setValue('South Sudan');
    form.wikiUrl.set('Shoebill');
    form.importFromWikipedia();
    expect(form.form.controls.habitat.value).toBe('Papyrus marshes');
    expect(form.form.controls.rangeRegion.value).toBe('South Sudan');
    expect(form.importMessage()).toContain('Filled in 13 fields');
  });
});

describe('AnimalForm repeated Wikipedia lookups', () => {
  const catPicture = 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Cat.jpg';
  const octopusPicture = 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Octopus.jpg';

  function setup(...results: WikipediaImport[]) {
    const lookup = vi.fn<typeof AnimalService.prototype.importFromWikipedia>();
    const create = vi.fn(() => of({}));
    for (const result of results) lookup.mockReturnValueOnce(of(result));
    TestBed.configureTestingModule({
      imports: [AnimalForm],
      providers: [
        provideRouter([]),
        {
          provide: AnimalService,
          useValue: { getAll: vi.fn(() => of([])), importFromWikipedia: lookup, create },
        },
      ],
    });
    const fixture = TestBed.createComponent(AnimalForm);
    fixture.detectChanges();
    return { fixture, form: fixture.componentInstance, create };
  }

  function lookUp(form: AnimalForm, query: string) {
    form.wikiUrl.set(query);
    form.importFromWikipedia();
  }

  it('preserves manually edited bounds when a partial lookup selects different units', () => {
    const { form, create } = setup(
      shoebill({
        lengthMmMin: 1000, lengthMmMax: null,
        heightMmMin: 1000, heightMmMax: null,
        weightGramsMin: 1000, weightGramsMax: null,
        lifespanMonthsMin: 24, lifespanMonthsMax: null,
      }),
      shoebill({
        lengthMmMin: null, lengthMmMax: 500,
        heightMmMin: null, heightMmMax: 500,
        weightGramsMin: null, weightGramsMax: 500,
        lifespanMonthsMin: null, lifespanMonthsMax: 18,
      }),
    );
    lookUp(form, 'first');
    expect(form.form.getRawValue()).toEqual(expect.objectContaining({
      lengthUnit: 'm', heightUnit: 'm', weightUnit: 'kg', lifespanUnit: 'year',
    }));
    form.form.patchValue({ lengthMin: 0.2, heightMin: 0.3, weightMin: 0.2, lifespanMin: 1 });
    lookUp(form, 'second');
    expect(form.form.getRawValue()).toEqual(expect.objectContaining({
      lengthMin: 20, lengthMax: 50, lengthUnit: 'cm',
      heightMin: 30, heightMax: 50, heightUnit: 'cm',
      weightMin: 200, weightMax: 500, weightUnit: 'g',
      lifespanMin: 12, lifespanMax: 18, lifespanUnit: 'month',
    }));
    form.submit();
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      lengthMmMin: 200, lengthMmMax: 500,
      heightMmMin: 300, heightMmMax: 500,
      weightGramsMin: 200, weightGramsMax: 500,
      lifespanMonthsMin: 12, lifespanMonthsMax: 18,
    }));
  });

  it('clears an unchanged imported bound when comparing its rounded display value', () => {
    const { form } = setup(
      shoebill({
        ...emptyMeasurements,
        lengthMmMin: 12345.67890123,
      }),
      shoebill({
        ...emptyMeasurements,
        lengthMmMax: 5000,
      }),
    );

    lookUp(form, 'first');
    expect(form.form.controls.lengthMin.value).toBe(12.3456789);
    lookUp(form, 'second');

    expect(form.form.controls.lengthMin.value).toBeNull();
    expect(form.form.controls.lengthMax.value).toBe(5);
    expect(form.form.controls.lengthUnit.value).toBe('m');
  });

  it('adds and removes the selected image row with the styled controls', () => {
    const { fixture, form } = setup();
    const element = fixture.nativeElement as HTMLElement;
    const urls = ['https://example.com/first.jpg', 'https://example.com/second.jpg', 'https://example.com/third.jpg'];
    form.imageRows.at(0).get('url')?.setValue(urls[0]);

    const addButton = element.querySelector('.image-actions button.btn-secondary') as HTMLButtonElement;
    expect(element.querySelectorAll('.image-row')).toHaveLength(1);
    addButton.click();
    fixture.detectChanges();
    form.imageRows.at(1).get('url')?.setValue(urls[1]);
    addButton.click();
    fixture.detectChanges();
    form.imageRows.at(2).get('url')?.setValue(urls[2]);

    const removeButton = element.querySelectorAll('.image-row')[1].querySelector('button.btn-danger');
    expect(removeButton).not.toBeNull();
    removeButton?.dispatchEvent(new MouseEvent('click'));
    fixture.detectChanges();

    expect(form.imageRows.length).toBe(2);
    expect(form.imageRows.at(0).get('url')?.value).toBe(urls[0]);
    expect(form.imageRows.at(1).get('url')?.value).toBe(urls[2]);
    expect(element.querySelectorAll('.image-row')).toHaveLength(2);
  });

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
    expect(form.imageRows.at(0).get('url')?.value).toBe(octopusPicture);
    expect(form.previewFailed(octopusPicture)).toBe(false);
    const preview = (fixture.nativeElement as HTMLElement).querySelector('img.preview');
    expect(preview?.getAttribute('src')).toBe(octopusPicture);
  });

  it('clears the earlier picture when the new lookup has none', () => {
    const { form } = setup(shoebill({ imageUrl: catPicture }), shoebill({ imageUrl: null }));
    lookUp(form, 'cat');
    lookUp(form, 'blue-ringed octopus');
    const image = form.imageRows.at(0);
    expect(image.get('url')?.value).toBe('');
    expect(image.get('attribution')?.value).toBe('');
    expect(image.get('sourcePageUrl')?.value).toBe('');
  });

  it('keeps a picture the user entered', () => {
    const own = 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Own.jpg';
    const { form } = setup(
      shoebill({ imageUrl: catPicture }),
      shoebill({ imageUrl: octopusPicture }),
    );
    const image = form.imageRows.at(0);
    image.get('url')?.setValue(own);
    image.get('attribution')?.setValue('My credit');
    image.get('sourcePageUrl')?.setValue('https://example.com/own');
    lookUp(form, 'cat');
    expect(image.get('url')?.value).toBe(own);
    expect(image.get('attribution')?.value).toBe('My credit');
    expect(image.get('sourcePageUrl')?.value).toBe('https://example.com/own');
    lookUp(form, 'blue-ringed octopus');
    expect(image.get('url')?.value).toBe(own);
    expect(image.get('attribution')?.value).toBe('My credit');
    expect(image.get('sourcePageUrl')?.value).toBe('https://example.com/own');
  });

  it('clears values left over from the earlier lookup', () => {
    const { form } = setup(
      shoebill({
        commonName: 'Cat',
        lifespanMonthsMin: 144,
        lifespanMonthsMax: 180,
        rangeRegion: 'Much of the world',
      }),
      shoebill({
        commonName: 'Blue-ringed octopus',
        lifespanMonthsMin: null,
        lifespanMonthsMax: null,
        rangeRegion: null,
      }),
    );
    lookUp(form, 'cat');
    lookUp(form, 'blue-ringed octopus');
    expect(form.form.controls.lifespanMin.value).toBeNull();
    expect(form.form.controls.lifespanMax.value).toBeNull();
    expect(form.form.controls.rangeRegion.value).toBe('');
  });

  it('keeps a value the user changed after the earlier lookup', () => {
    const { form } = setup(
      shoebill({ rangeRegion: 'Much of the world', lifespanMonthsMax: 180 }),
      shoebill({ rangeRegion: null, lifespanMonthsMax: null }),
    );
    lookUp(form, 'cat');
    form.form.controls.rangeRegion.setValue('Indo-Pacific');
    form.form.controls.lifespanMax.setValue(2);
    lookUp(form, 'blue-ringed octopus');
    expect(form.form.controls.rangeRegion.value).toBe('Indo-Pacific');
    expect(form.form.controls.lifespanMax.value).toBe(2);
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
    ...emptyMeasurements,
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
            getTranslation: vi.fn(() => throwError(() => ({ status: 404 }))),
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
    expect(form.imageRows.at(0).get('url')!.value).toBe(hornwormPicture);
  });

  it('keeps the saved picture when the same animal is filled in again', () => {
    const { form } = setup(
      shoebill({ imageUrl: hornwormPicture, scientificName: boxerCrab.scientificName }),
    );
    lookUp(form, 'boxer crab');
    expect(form.imageRows.at(0).get('url')!.value).toBe(boxerCrabPicture);
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
  const dog = { ...emptyMeasurements, id: 2, commonName: 'Dog', isDomesticated: true, iucnStatus: null } as Animal;

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
            getTranslation: vi.fn(() => throwError(() => ({ status: 404 }))),
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
  const okapi = {
    ...emptyMeasurements,
    id: 3,
    commonName: 'Okapi',
    isDomesticated: false,
    habitatType: 'forest',
  } as Animal;

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
            getTranslation: vi.fn(() => throwError(() => ({ status: 404 }))),
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

describe('AnimalForm image previews', () => {
  const imageUrl = 'https://upload.wikimedia.org/wikipedia/commons/okapi.jpg';
  const animal = { ...emptyMeasurements, id: 1, commonName: 'Okapi', isDomesticated: false } as Animal;

  function setup() {
    TestBed.configureTestingModule({
      imports: [AnimalForm],
      providers: [
        provideRouter([]),
        {
          provide: AnimalService,
          useValue: {
            getAll: vi.fn(() => of([])),
            getById: vi.fn(() => of(animal)),
            getImages: vi.fn(() => of([{ kind: 'unspecified', url: imageUrl, caption: null }])),
            importFromWikipedia: vi.fn(() => of(shoebill())),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(AnimalForm);
    fixture.detectChanges();
    return { fixture, form: fixture.componentInstance };
  }

  it('keeps an empty preview frame and does not request an image for an invalid URL', () => {
    const { fixture, form } = setup();
    const frame = (): HTMLElement => fixture.nativeElement.querySelector('.preview-frame');
    const urlControl = form.imageRows.at(0).get('url')!;

    expect(frame()).not.toBeNull();
    expect(frame().querySelector('img')).toBeNull();
    expect(frame().textContent).toContain('No picture yet. If Wikipedia has none, paste an image URL from Wikimedia Commons.');
    expect(form.canPreviewImage('images.0.url')).toBe(false);

    urlControl.setValue('https://');
    fixture.detectChanges();

    expect(urlControl.invalid).toBe(true);
    expect(frame().querySelector('img')).toBeNull();
    expect(frame().textContent).toContain("That doesn't look like an image link.");
    expect(form.canPreviewImage('images.0.url')).toBe(false);

    urlControl.setValue('http://upload.wikimedia.org/image.jpg');
    fixture.detectChanges();

    expect(urlControl.invalid).toBe(true);
    expect(frame().querySelector('img')).toBeNull();
    expect(frame().textContent).toContain("That doesn't look like an image link.");
    expect(form.canPreviewImage('images.0.url')).toBe(false);
  });

  it('shows the invalid-link hint when a visible preview is changed to an invalid URL', () => {
    const { fixture, form } = setup();
    const urlControl = form.imageRows.at(0).get('url')!;
    const frame = (): HTMLElement => fixture.nativeElement.querySelector('.preview-frame');

    urlControl.setValue(imageUrl);
    fixture.detectChanges();
    expect(frame().querySelector('img')?.getAttribute('src')).toBe(imageUrl);

    for (const invalidUrl of ['https://', 'abc']) {
      urlControl.setValue(invalidUrl);
      fixture.detectChanges();

      expect(urlControl.untouched).toBe(true);
      expect(frame().querySelector('img')).toBeNull();
      expect(frame().textContent).toContain("That doesn't look like an image link.");
      expect(fixture.nativeElement.querySelector('.image-row > .field-error')).toBeNull();
    }
  });

  it('shows the invalid-link hint after a Wikipedia import preview is edited', () => {
    const { fixture, form } = setup();
    form.wikiUrl.set('Bengal tiger');
    form.importFromWikipedia();
    fixture.detectChanges();

    const urlControl = form.imageRows.at(0).get('url')!;
    const importedUrl = urlControl.value;
    const frame = fixture.nativeElement.querySelector('.preview-frame') as HTMLElement;
    expect(frame.querySelector('img')?.getAttribute('src')).toBe(importedUrl);

    urlControl.setValue('abc');
    fixture.detectChanges();

    expect(urlControl.untouched).toBe(true);
    expect(frame.querySelector('img')).toBeNull();
    expect(frame.textContent).toContain("That doesn't look like an image link.");
    expect(fixture.nativeElement.querySelector('.image-row > .field-error')).toBeNull();
  });

  it('shows the not-found hint inside the preview frame after an image error', () => {
    const { fixture, form } = setup();
    form.imageRows.at(0).get('url')!.setValue(imageUrl);
    fixture.detectChanges();

    expect(form.canPreviewImage('images.0.url')).toBe(true);
    expect((fixture.nativeElement.querySelector('.image-row input[type="url"]') as HTMLInputElement).value).toBe(imageUrl);
    expect(form.imageRows.at(0).get('url')!.valid).toBe(true);
    const image = fixture.nativeElement.querySelector('.preview-frame img') as HTMLImageElement | null;
    expect(image).not.toBeNull();
    image?.dispatchEvent(new Event('error'));
    expect(form.previewFailed(imageUrl)).toBe(true);
    fixture.detectChanges();

    const frame = fixture.nativeElement.querySelector('.preview-frame') as HTMLElement;
    expect(frame.querySelector('img')).toBeNull();
    expect(frame.textContent).toContain('No picture found at this link.');
  });

  it('replaces the preview element when a valid URL changes and shows not-found after its error', () => {
    const { fixture, form } = setup();
    const urlControl = form.imageRows.at(0).get('url')!;
    urlControl.setValue(imageUrl);
    fixture.detectChanges();
    const oldImage = fixture.nativeElement.querySelector('.preview-frame img') as HTMLImageElement;

    const newUrl = 'https://upload.wikimedia.org/wikipedia/commons/new-image.jpg';
    urlControl.setValue(newUrl);
    fixture.detectChanges();
    const newImage = fixture.nativeElement.querySelector(
      '.preview-frame img',
    ) as HTMLImageElement | null;

    expect(newImage).not.toBeNull();
    expect(newImage!.getAttribute('src')).toBe(newUrl);
    expect(newImage).not.toBe(oldImage);
    expect(oldImage.isConnected).toBe(false);

    newImage!.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    const frame = fixture.nativeElement.querySelector('.preview-frame') as HTMLElement;
    expect(frame.querySelector('img')).toBeNull();
    expect(frame.textContent).toContain('No picture found at this link.');
  });

  it('shows the empty hint when the URL is cleared after a visible preview', () => {
    const { fixture, form } = setup();
    const urlControl = form.imageRows.at(0).get('url')!;
    urlControl.setValue(imageUrl);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.preview-frame img')).not.toBeNull();

    urlControl.setValue('');
    fixture.detectChanges();

    const frame = fixture.nativeElement.querySelector('.preview-frame') as HTMLElement;
    expect(frame.querySelector('img')).toBeNull();
    expect(frame.textContent).toContain(
      'No picture yet. If Wikipedia has none, paste an image URL from Wikimedia Commons.',
    );
  });

  it('retries a previously failed image after its URL is edited', () => {
    const { fixture, form } = setup();
    const urlControl = form.imageRows.at(0).get('url')!;
    urlControl.setValue(imageUrl);
    fixture.detectChanges();
    const image = fixture.nativeElement.querySelector('.preview-frame img') as HTMLImageElement | null;
    expect(image).not.toBeNull();
    image!.dispatchEvent(new Event('error'));
    expect(form.previewFailed(imageUrl)).toBe(true);
    fixture.detectChanges();

    urlControl.setValue('https://upload.wikimedia.org/wikipedia/commons/other.jpg');
    fixture.detectChanges();
    urlControl.setValue(imageUrl);
    expect(form.previewFailed(imageUrl)).toBe(false);
    fixture.detectChanges();

    const retriedImage = fixture.nativeElement.querySelector('.preview-frame img') as HTMLImageElement | null;
    expect(form.previewFailed(imageUrl)).toBe(false);
    expect(retriedImage).not.toBeNull();
    expect(retriedImage!.getAttribute('src')).toBe(imageUrl);
  });

  it('clears failed preview state when an animal finishes loading', () => {
    const { fixture, form } = setup();
    form.markPreviewFailed(imageUrl);
    expect(form.previewFailed(imageUrl)).toBe(true);

    fixture.componentRef.setInput('id', '1');
    fixture.detectChanges();

    expect(form.previewFailed(imageUrl)).toBe(false);
  });
});
