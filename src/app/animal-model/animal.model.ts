export type AnimalReviewStatus = 'pending' | 'approved' | 'rejected';
export type AnimalSubmitter = 'tester' | 'admin';

export interface Animal {
  id: number;
  commonName: string;
  scientificName: string | null;
  family: string | null;
  taxonomicClass: string | null;
  isDomesticated: boolean;
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
  habitatType: string | null;
  rangeRegion: string | null;
  profile: string | null;
  sourceUrl: string | null;
  thumbnailUrl: string | null;
  status: AnimalReviewStatus;
  submittedBy: AnimalSubmitter;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewAnimalImage {
  kind: 'male' | 'female' | 'baby' | 'unspecified';
  url: string;
  caption: string | null;
  attribution: string | null;
  sourcePageUrl: string | null;
}

export type NewAnimal = Omit<
  Animal,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'thumbnailUrl'
  | 'status'
  | 'submittedBy'
  | 'reviewedAt'
  | 'reviewNote'
> & {
  images: NewAnimalImage[];
};

export interface AnimalTexts {
  commonName: string | null;
  habitat: string | null;
  rangeRegion: string | null;
  profile: string | null;
}
