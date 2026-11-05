const THUMB_URL = /^(https:\/\/[^/]+\/wikipedia\/[^/]+\/thumb\/[^?#]+\/)(\d+)px-([^/?#]+)$/;

const ORIGINAL_URL =
  /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/[^/]+\/)([0-9a-f]\/[0-9a-f]{2}\/)([^/?#]+\.(?:jpe?g|png))$/i;

export const WIKIMEDIA_WIDTHS = [250, 500, 960, 1280] as const;
const ORIGINAL_THUMB_WIDTHS = [250, 500] as const;

function originalSrcset(url: string): string | null {
  const match = ORIGINAL_URL.exec(url);
  if (!match) {
    return null;
  }
  const [, root, folder, file] = match;
  const thumbs = ORIGINAL_THUMB_WIDTHS.map(
    (w) => `${root}thumb/${folder}${file}/${w}px-${file} ${w}w`,
  );
  return [...thumbs, `${url} 1280w`].join(', ');
}

export function wikimediaSrcset(url: string | null | undefined): string | null {
  const trimmed = url?.trim() ?? '';
  const match = THUMB_URL.exec(trimmed);
  if (!match) {
    return originalSrcset(trimmed);
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
