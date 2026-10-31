export interface AnimalStats {
  totalAnimals: number;
  domesticatedAnimals: number;
  byClass: Record<string, number>,
  byIucnStatus: Record<string, number>,
}
