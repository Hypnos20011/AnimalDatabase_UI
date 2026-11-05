import { Routes } from '@angular/router';
import { AnimalsList } from './animals-list/animals-list';
import { adminGuard } from './admin/admin.guard';

export const routes: Routes = [
  { path: '', component: AnimalsList, title: 'Unusual Animals' },
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin-unlock').then((m) => m.AdminUnlock),
    title: 'Admin · Unusual Animals',
  },
  {
    path: 'animals/new',
    loadComponent: () => import('./animal-form/animal-form').then((m) => m.AnimalForm),
    canActivate: [adminGuard],
    title: 'New animal · Unusual Animals',
  },
  {
    path: 'animals/:id/edit',
    loadComponent: () => import('./animal-form/animal-form').then((m) => m.AnimalForm),
    canActivate: [adminGuard],
    title: 'Edit animal · Unusual Animals',
  },
  {
    path: 'animals/:id',
    loadComponent: () => import('./animal-detail/animal-detail').then((m) => m.AnimalDetail),
    title: 'Unusual Animals',
  },
  {
    path: 'stats',
    loadComponent: () => import('./animal-stats/stats').then((m) => m.Stats),
    title: 'Stats - Unusual Animals',
  },
  {
    path: 'compare',
    loadComponent: () => import('./compare/compare').then((m) => m.Compare),
    title: 'Compare · Unusual Animals',
  },
  {
    path: 'quiz',
    loadComponent: () => import('./quiz/quiz').then((m) => m.Quiz),
    title: 'Quiz · Unusual Animals',
  },
  { path: '**', redirectTo: '' },
];
