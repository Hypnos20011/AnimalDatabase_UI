export interface AnimalImage {
  id: number;
  animalId: number;
  kind: string;
  url: string;
  caption: string | null;
  sortOrder: number;
  createdAt: string;
}
