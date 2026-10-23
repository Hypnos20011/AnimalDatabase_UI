export type HeroLayout = 'pending' | 'overlay' | 'side';

export const OVERLAY_MIN_RATIO = 1.3;

export function heroLayout(
  width: number | null | undefined,
  height: number | null | undefined,
): HeroLayout {
  if (!width || !height || width <= 0 || height <= 0) {
    return 'pending';
  }
  return width / height >= OVERLAY_MIN_RATIO ? 'overlay' : 'side';
}
