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