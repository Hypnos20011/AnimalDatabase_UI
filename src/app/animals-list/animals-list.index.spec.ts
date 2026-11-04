import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AnimalsList } from './animals-list';
import { AnimalListState } from './animal-list-state';
import { AnimalService } from '../shared/animal.service';
import { SearchService } from './search.service';
import { Animal } from '../animal-model/animal.model';

function animal(id: number, commonName: string, extra: Partial<Animal> = {}): Animal {
  return {
    id,
    commonName,
    scientificName: null,
    family: null,
    taxonomicClass: 'mammal',
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
    thumbnailUrl: null,
    createdAt: '2026-10-08T10:00:00',
    updatedAt: '2026-10-08T10:00:00',
    ...extra,
  } as unknown as Animal;
}

const animals = [
  animal(1, 'Aardvark', { iucnStatus: 'Least Concern', family: 'Orycteropodidae' }),
  animal(2, 'Okapi', {
    iucnStatus: 'Endangered',
    family: 'Giraffidae',
    habitat: 'Dense tropical rainforest',
    habitatType: 'forest',
  }),
  animal(3, 'Tiger'),
];

describe('AnimalsList index', () => {
  let record: ReturnType<typeof vi.fn>;

  async function render() {
    record = vi.fn(() => of(undefined));
    TestBed.configureTestingModule({
      imports: [AnimalsList],
      providers: [
        provideRouter([{ path: 'animals/:id', children: [] }]),
        { provide: AnimalService, useValue: { getAll: vi.fn(() => of(animals)) } },
        { provide: SearchService, useValue: { getTop: vi.fn(() => of([])), record } },
      ],
    });
    const fixture = TestBed.createComponent(AnimalsList);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const rows = () => Array.from(element.querySelectorAll<HTMLElement>('.row'));
    const previewName = () => element.querySelector('.preview-name')?.textContent?.trim();
    return { fixture, element, rows, previewName };
  }

  it('renders numbered rows that link to the detail page', async () => {
    const { rows } = await render();
    const links = rows().map((row) => row.querySelector('a.row-link')!);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/animals/1',
      '/animals/2',
      '/animals/3',
    ]);
    expect(rows().map((row) => row.querySelector('.num')!.textContent!.trim())).toEqual([
      '01',
      '02',
      '03',
    ]);
  });

  it('makes the first animal active by default', async () => {
    const { rows, previewName } = await render();
    expect(rows()[0].classList).toContain('is-active');
    expect(previewName()).toBe('Aardvark');
  });

  it('follows mouse hover', async () => {
    const { fixture, rows, previewName } = await render();
    rows()[1].querySelector('a')!.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    expect(previewName()).toBe('Okapi');
    expect(rows()[1].classList).toContain('is-active');
    expect(rows()[0].classList).not.toContain('is-active');
  });

  it('follows keyboard focus', async () => {
    const { fixture, rows, previewName, element } = await render();
    rows()[2].querySelector('a')!.dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();
    expect(previewName()).toBe('Tiger');
    expect(element.querySelector('.preview-num')!.textContent!.trim()).toBe('03');
  });

  it('shows family and habitat type in the preview, not the habitat text', async () => {
    const { fixture, rows, element } = await render();
    expect(element.querySelector('.preview-extra')!.textContent!.trim()).toBe('Orycteropodidae');
    rows()[1].querySelector('a')!.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    expect(element.querySelector('.preview-extra')!.textContent!.trim()).toBe('Giraffidae / forest');
  });

  it('shows status codes and a dash without a status', async () => {
    const { rows } = await render();
    const codes = rows().map((row) => row.querySelector('.code')!.textContent!.trim());
    expect(codes).toEqual(['LC', 'EN', '\u2014']);
    expect(rows()[2].querySelector('.visually-hidden')!.textContent).toContain('Status unknown');
  });

  it('records the search when a row is opened', async () => {
    const { rows, fixture } = await render();
    rows()[1].querySelector<HTMLAnchorElement>('a')!.click();
    await fixture.whenStable();
    expect(record).toHaveBeenCalledWith('', 2);
  });

  it('shows the count in the header', async () => {
    const { element } = await render();
    expect(element.querySelector('.count')!.textContent!.trim()).toBe('03');
    expect(element.querySelector('h2 .visually-hidden')!.textContent).toContain('3 animals');
  });

  it('shares the visible animals as the random pool', async () => {
    await render();
    expect(TestBed.inject(AnimalListState).randomPool()).toEqual([1, 2, 3]);
  });
});
