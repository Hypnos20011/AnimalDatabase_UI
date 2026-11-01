import { Routes } from '@angular/router';
import { AnimalsList } from './animals-list/animals-list';
import { AnimalForm } from './animal-form/animal-form';
import { AnimalDetail } from './animal-detail/animal-detail';
import { AdminUnlock } from './admin/admin-unlock';
import { adminGuard } from './admin/admin.guard';
import { Stats } from './animal-stats/stats';

export const routes: Routes = [
  { path: '', component: AnimalsList, title: 'Unusual Animals' },
  { path: 'admin', component: AdminUnlock, title: 'Admin · Unusual Animals' },
  {
    path: 'animals/new',
    component: AnimalForm,
    canActivate: [adminGuard],
    title: 'New animal · Unusual Animals',
  },
  {
    path: 'animals/:id/edit',
    component: AnimalForm,
    canActivate: [adminGuard],
    title: 'Edit animal · Unusual Animals',
  },
  { path: 'animals/:id', component: AnimalDetail, title: 'Unusual Animals' },
  { path: 'stats', component: Stats, title: 'Stats - Unusual Animals' },
  { path: '**', redirectTo: '' },
];
