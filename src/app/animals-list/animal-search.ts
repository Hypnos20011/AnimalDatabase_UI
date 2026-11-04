import { Animal } from '../animal-model/animal.model';
import {TranslationKey} from '../shared/i18n/en';

export type SearchableAnimal = Pick<
  Animal,
  'commonName' | 'scientificName' | 'habitat' | 'rangeRegion' | 'profile'
>;

export interface SearchMatch {
  name: boolean;
  habitat: boolean;
  range: boolean;
  description: boolean;
}

export function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function matchAnimal(animal: SearchableAnimal, query: string): SearchMatch | null {
  const needle = normalizeText(query);
  if (!needle) return null;
  const contains = (value: string | null | undefined) => normalizeText(value).includes(needle);
  const match: SearchMatch = {
    name: contains(animal.commonName) || contains(animal.scientificName),
    habitat: contains(animal.habitat),
    range: contains(animal.rangeRegion),
    description: contains(animal.profile),
  };
  return match.name || match.habitat || match.range || match.description ? match : null;
}

export function matchRank(match: SearchMatch | null | undefined): number {
  if (!match || match.name) return 0;
  if (match.habitat) return 1;
  if (match.range) return 2;
  return 3;
}

export function matchHint(match: SearchMatch | null | undefined): TranslationKey | null {
  if (!match || match.name) return null;
  if (match.habitat && match.range) return 'list.match.habitatRange';
  if (match.habitat) return 'list.match.habitat';
  if (match.range) return 'list.match.range';
  return null;
}
