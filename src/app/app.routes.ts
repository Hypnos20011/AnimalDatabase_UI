import { Routes } from '@angular/router';
import { AnimalsList } from './animals-list/animals-list';
import { AnimalForm } from './animal-form/animal-form';

export const routes: Routes = [
  { path: '', component: AnimalsList },
  { path: 'animals/new', component: AnimalForm },
  { path: '**', redirectTo: '' },
];
