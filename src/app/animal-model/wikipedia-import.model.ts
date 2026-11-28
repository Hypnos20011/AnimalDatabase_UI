export interface WikipediaImport {
  commonName: string | null;
  scientificName: string | null;
  family: string | null;
  taxonomicClass: string | null;
  lengthMmMin: number | null;
  lengthMmMax: number | null;
  heightMmMin: number | null;
  heightMmMax: number | null;
  weightGramsMin: number | null;
  weightGramsMax: number | null;
  lifespanMonthsMin: number | null;
  lifespanMonthsMax: number | null;
  iucnStatus: string | null;
  habitat: string | null;
  rangeRegion: string | null;
  profile: string | null;
  imageUrl: string | null;
  attribution: string | null;
  sourcePageUrl: string | null;
  sourceUrl: string | null;
  warnings: string[];
}
