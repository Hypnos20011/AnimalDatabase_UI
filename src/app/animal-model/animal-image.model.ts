export interface AnimalImage {
  id: number;
  animalId: number;
  kind: string;
  url: string;
  caption: string | null;
  attribution: string | null;
  sourcePageUrl: string | null;
  sortOrder: number;
  createdAt: string;
}