import { Routes } from '@angular/router';
import { AnimalsList } from './animals-list/animals-list';
import { AnimalForm } from './animal-form/animal-form';
import { AnimalDetail } from './animal-detail/animal-detail';

export const routes: Routes = [
  { path: '', component: AnimalsList },
  { path: 'animals/new', component: AnimalForm },
  { path: 'animals/:id', component: AnimalDetail },
  { path: '**', redirectTo: '' },
];
