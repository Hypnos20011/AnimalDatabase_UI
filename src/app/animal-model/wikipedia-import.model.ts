export interface WikipediaImport {
  commonName: string | null;
  scientificName: string | null;
  family: string | null;
  taxonomicClass: string | null;
  sizeLengthCmMin: number | null;
  sizeLengthCmMax: number | null;
  weightKgMin: number | null;
  weightKgMax: number | null;
  lifespanYearsMin: number | null;
  lifespanYearsMax: number | null;
  iucnStatus: string | null;
  habitat: string | null;
  rangeRegion: string | null;
  profile: string | null;
  imageUrl: string | null;
  sourceUrl: string | null;
  warnings: string[];
}
