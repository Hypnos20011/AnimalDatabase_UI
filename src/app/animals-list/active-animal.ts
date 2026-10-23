export interface ActiveEntry<T> {
  item: T;
  index: number;
}

export function pickActive<T extends { id: number }>(
  list: readonly T[],
  activeId: number | null,
): ActiveEntry<T> | null {
  if (list.length === 0) return null;
  if (activeId !== null) {
    const index = list.findIndex((item) => item.id === activeId);
    if (index >= 0) return { item: list[index], index };
  }
  return { item: list[0], index: 0 };
}

export function indexLabel(index: number): string {
  return String(index + 1).padStart(2, '0');
}
