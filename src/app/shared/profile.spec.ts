import { profileSnippet, splitProfile } from './profile';

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
