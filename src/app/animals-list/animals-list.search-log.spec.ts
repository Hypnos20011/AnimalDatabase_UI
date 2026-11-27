import { TestBed } from '@angular/core/testing';
import { provideLockedAdmin } from './animals-list-test-support';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AnimalsList } from './animals-list';
import { AnimalService } from '../shared/animal.service';
import { SearchService } from './search.service';
import { Animal } from '../animal-model/animal.model';

describe('AnimalsList search log', () => {
  it('keeps opening animals when the search log is rate limited', async () => {
    const tooMany = new HttpErrorResponse({ status: 429, error: 'Too many requests.' });
    const searchService = {
      getTop: vi.fn(() => of([])),
      record: vi.fn(() => throwError(() => tooMany)),
    };
    TestBed.configureTestingModule({
      imports: [AnimalsList],
      providers: [
        provideLockedAdmin(),
        provideRouter([]),
        { provide: AnimalService, useValue: { getAll: vi.fn(() => of([])) } },
        { provide: SearchService, useValue: searchService },
      ],
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(AnimalsList);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(() => fixture.componentInstance.selectAnimal({ id: 7 } as Animal)).not.toThrow();
    fixture.detectChanges();

    expect(searchService.record).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/animals', 7]);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Too many');
  });
});
