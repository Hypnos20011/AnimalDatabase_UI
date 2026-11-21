export interface ProfileParts {
  text: string;
  funFact: string;
}

export const SNIPPET_LENGTH = 220;

export function preserveFunFactMarker(
  source: string | null | undefined,
  translated: string | null | undefined,
): string {
  const value = translated ?? '';
  const match = (source ?? '').match(/\s*Fun fact:\s*/i);
  if (!match) return value;
  if (value.includes(match[0])) return value;
  const loose = value.match(/\s*fun fact\s*:\s*/i);
  return loose ? value.replace(loose[0], match[0]) : value;
}

export function splitProfile(profile: string | null | undefined): ProfileParts {
  const value = profile ?? '';
  const match = value.match(/\s*Fun fact:\s*/i);
  if (!match || match.index === undefined) return { text: value.trim(), funFact: '' };
  return {
    text: value.slice(0, match.index).trim(),
    funFact: value.slice(match.index + match[0].length).trim(),
  };
}

export function profileSnippet(text: string, maxLength = SNIPPET_LENGTH): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  const cut = clean.slice(0, maxLength);
  const sentenceEnd = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (sentenceEnd >= maxLength / 2) return cut.slice(0, sentenceEnd + 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > 0 ? cut.slice(0, space) : cut).replace(/[\s,;:.]+$/, '')}…`;
}
