export interface WordUnit {
  one: string;
  other: string;
}

export function pluralWord(count: number, unit: WordUnit): string {
  return count === 1 ? unit.one : unit.other;
}

export function formatCount(count: number, unit: WordUnit): string {
  return `${count} ${pluralWord(count, unit)}`;
}
