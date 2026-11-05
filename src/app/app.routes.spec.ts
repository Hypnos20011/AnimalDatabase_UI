import { AdminUnlock } from './admin/admin-unlock';
import { adminGuard } from './admin/admin.guard';
import { AnimalDetail } from './animal-detail/animal-detail';
import { AnimalForm } from './animal-form/animal-form';
import { Stats } from './animal-stats/stats';
import { AnimalsList } from './animals-list/animals-list';
import { Compare } from './compare/compare';
import { Quiz } from './quiz/quiz';
import { routes } from './app.routes';

describe('routes', () => {
  const route = (path: string) => routes.find((entry) => entry.path === path)!;

  it('keeps the list on the first screen and the same paths, titles, and guards', () => {
    expect(routes.map((entry) => entry.path)).toEqual([
      '',
      'admin',
      'animals/new',
      'animals/:id/edit',
      'animals/:id',
      'stats',
      'compare',
      'quiz',
      '**',
    ]);
    expect(route('').component).toBe(AnimalsList);
    expect(route('').title).toBe('Unusual Animals');
    expect(route('admin').title).toBe('Admin · Unusual Animals');
    expect(route('animals/new').canActivate).toEqual([adminGuard]);
    expect(route('animals/new').title).toBe('New animal · Unusual Animals');
    expect(route('animals/:id/edit').canActivate).toEqual([adminGuard]);
    expect(route('animals/:id/edit').title).toBe('Edit animal · Unusual Animals');
    expect(route('animals/:id').title).toBe('Unusual Animals');
    expect(route('stats').title).toBe('Stats - Unusual Animals');
    expect(route('compare').title).toBe('Compare · Unusual Animals');
    expect(route('quiz').title).toBe('Quiz · Unusual Animals');
    expect(route('**').redirectTo).toBe('');
  });

  it('loads each secondary page on demand', async () => {
    await expect(route('admin').loadComponent!()).resolves.toBe(AdminUnlock);
    await expect(route('animals/new').loadComponent!()).resolves.toBe(AnimalForm);
    await expect(route('animals/:id/edit').loadComponent!()).resolves.toBe(AnimalForm);
    await expect(route('animals/:id').loadComponent!()).resolves.toBe(AnimalDetail);
    await expect(route('stats').loadComponent!()).resolves.toBe(Stats);
    await expect(route('compare').loadComponent!()).resolves.toBe(Compare);
    await expect(route('quiz').loadComponent!()).resolves.toBe(Quiz);
  });
});
