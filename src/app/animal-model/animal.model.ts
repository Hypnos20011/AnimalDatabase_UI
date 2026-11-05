export interface Animal {
  id: number;
  commonName: string;
  scientificName: string | null;
  family: string | null;
  taxonomicClass: string | null;
  isDomesticated: boolean;
  sizeLengthCmMin: number | null;
  sizeLengthCmMax: number | null;
  sizeHeightCmMin: number | null;
  sizeHeightCmMax: number | null;
  weightKgMin: number | null;
  weightKgMax: number | null;
  lifespanYearsMin: number | null;
  lifespanYearsMax: number | null;
  iucnStatus: string | null;
  habitat: string | null;
  habitatType: string | null;
  rangeRegion: string | null;
  profile: string | null;
  sourceUrl?: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewAnimalImage {
  kind: 'male' | 'female' | 'baby' | 'unspecified';
  url: string;
  caption: string | null;
}

export type NewAnimal = Omit<Animal, 'id' | 'createdAt' | 'updatedAt' | 'thumbnailUrl'> & {
  images: NewAnimalImage[];
};

export interface AnimalTexts {
  commonName: string | null;
  habitat: string | null;
  rangeRegion: string | null;
  profile: string | null;
}
