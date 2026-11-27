import { Animal, NewAnimal } from '../animal-model/animal.model';
import { animalStatusLabel, isPublicAnimal } from './animal-status';

describe('animal review status', () => {
  it('only excludes pending and rejected animals from public collections', () => {
    expect(isPublicAnimal({ status: 'approved' })).toBe(true);
    expect(isPublicAnimal({ status: 'pending' })).toBe(false);
    expect(isPublicAnimal({ status: 'rejected' })).toBe(false);
    expect(isPublicAnimal({} as Animal)).toBe(true);
    expect(isPublicAnimal({ status: null } as unknown as Animal)).toBe(true);
    expect(isPublicAnimal({ status: 'unknown' } as unknown as Animal)).toBe(true);
  });

  it('returns English labels only for pending and rejected statuses', () => {
    expect(animalStatusLabel('pending')).toBe('Pending review');
    expect(animalStatusLabel('rejected')).toBe('Rejected');
    expect(animalStatusLabel('approved')).toBeNull();
    expect(animalStatusLabel(undefined)).toBeNull();
  });

  it('does not include response-only review fields in animal writes', () => {
    const omitted: Extract<
      keyof NewAnimal,
      'status' | 'submittedBy' | 'reviewedAt' | 'reviewNote'
    > extends never
      ? true
      : false = true;
    expect(omitted).toBe(true);
  });
});
