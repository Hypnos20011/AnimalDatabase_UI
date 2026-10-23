const THUMB_URL = /^(https:\/\/[^/]+\/wikipedia\/[^/]+\/thumb\/[^?#]+\/)(\d+)px-([^/?#]+)$/;

export const WIKIMEDIA_WIDTHS = [250, 500, 960, 1280] as const;

export function wikimediaSrcset(url: string | null | undefined): string | null {
  const match = url ? THUMB_URL.exec(url.trim()) : null;
  if (!match) {
    return null;
  }
  const [, base, width, file] = match;
  const widths = WIKIMEDIA_WIDTHS.filter((w) => w <= Number(width));
  if (widths.length < 2) {
    return null;
  }
  return widths.map((w) => `${base}${w}px-${file} ${w}w`).join(', ');
}

export function sameName(
  caption: string | null | undefined,
  ...names: (string | null | undefined)[]
): boolean {
  const norm = (value: string | null | undefined) => (value ?? '').trim().toLowerCase();
  const text = norm(caption);
  return !!text && names.some((name) => norm(name) === text);
}
