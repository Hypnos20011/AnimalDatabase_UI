import { Animal } from '../animal-model/animal.model';

export function isPublicAnimal(animal: Pick<Animal, 'status'>): boolean {
  return animal.status !== 'pending' && animal.status !== 'rejected';
}

export function animalStatusLabel(status: string | null | undefined): string | null {
  if (status === 'pending') return 'Pending review';
  if (status === 'rejected') return 'Rejected';
  return null;
}
