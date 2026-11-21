import { preserveFunFactMarker, profileSnippet, splitProfile } from './profile';

describe('splitProfile', () => {
  it('splits the fun fact from the profile text', () => {
    expect(splitProfile('Lives in forests. Fun fact: It has a blue tongue.')).toEqual({
      text: 'Lives in forests.',
      funFact: 'It has a blue tongue.',
    });
  });

  it('returns the whole text when there is no fun fact', () => {
    expect(splitProfile('  Lives in forests.  ')).toEqual({
      text: 'Lives in forests.',
      funFact: '',
    });
  });

  it('handles a missing profile', () => {
    expect(splitProfile(null)).toEqual({ text: '', funFact: '' });
  });
});

describe('preserveFunFactMarker', () => {
  it('puts the original marker back when the translation changes its spelling', () => {
    const source = 'A salamander. Fun fact: It keeps its gills.';
    expect(preserveFunFactMarker(source, 'Une salamandre. fun fact: Il garde ses branchies.')).toBe(
      'Une salamandre. Fun fact: Il garde ses branchies.',
    );
  });

  it('leaves a profile alone when the marker is already exact', () => {
    const translated = 'Une salamandre. Fun fact: Il garde ses branchies.';
    expect(preserveFunFactMarker('A salamander. Fun fact: It keeps its gills.', translated)).toBe(
      translated,
    );
  });
});

describe('profileSnippet', () => {
  it('keeps short text as it is', () => {
    expect(profileSnippet('Short and  sweet.')).toBe('Short and sweet.');
  });

  it('cuts long text at a sentence end', () => {
    const text = `${'a'.repeat(80)}. ${'b'.repeat(80)}. ${'c'.repeat(80)}.`;
    expect(profileSnippet(text, 200)).toBe(`${'a'.repeat(80)}. ${'b'.repeat(80)}.`);
  });

  it('cuts long text at a word and adds an ellipsis', () => {
    const text = Array.from({ length: 60 }, () => 'word').join(' ');
    const snippet = profileSnippet(text, 50);
    expect(snippet.endsWith('word…')).toBe(true);
    expect(snippet.length).toBeLessThanOrEqual(51);
  });
});
