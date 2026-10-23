import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AnimalForm } from './animal-form';
import { AnimalService } from '../animal.service';
import { WikipediaImport } from '../animal-model/wikipedia-import.model';

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
