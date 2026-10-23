import { Routes } from '@angular/router';
import { AnimalsList } from './animals-list/animals-list';
import { AnimalForm } from './animal-form/animal-form';
import { AnimalDetail } from './animal-detail/animal-detail';
import { AdminUnlock } from './admin/admin-unlock';
import { adminGuard } from './admin/admin.guard';

export const routes: Routes = [
  { path: '', component: AnimalsList },
  { path: 'admin', component: AdminUnlock },
  { path: 'animals/new', component: AnimalForm, canActivate: [adminGuard] },
  { path: 'animals/:id/edit', component: AnimalForm, canActivate: [adminGuard] },
  { path: 'animals/:id', component: AnimalDetail },
  { path: '**', redirectTo: '' },
];
