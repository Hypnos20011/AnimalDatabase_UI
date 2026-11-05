import { sameName, wikimediaSrcset } from './wikimedia-image';

const base = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Axolotl_ganz.jpg/';

describe('wikimediaSrcset', () => {
  it('lists standard widths up to the stored thumbnail width', () => {
    expect(wikimediaSrcset(`${base}1280px-Axolotl_ganz.jpg`)).toBe(
      `${base}250px-Axolotl_ganz.jpg 250w, ${base}500px-Axolotl_ganz.jpg 500w, ` +
        `${base}960px-Axolotl_ganz.jpg 960w, ${base}1280px-Axolotl_ganz.jpg 1280w`,
    );
  });

  it('never asks for a thumbnail wider than the stored one', () => {
    expect(wikimediaSrcset(`${base}500px-Axolotl_ganz.jpg`)).toBe(
      `${base}250px-Axolotl_ganz.jpg 250w, ${base}500px-Axolotl_ganz.jpg 500w`,
    );
  });

  it('keeps encoded file names intact', () => {
    const url =
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b0/Tiger_%28P%29.jpg/960px-Tiger_%28P%29.jpg';
    expect(wikimediaSrcset(url)).toContain(
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b0/Tiger_%28P%29.jpg/250px-Tiger_%28P%29.jpg 250w',
    );
  });

  it('offers small thumbnails for an original file and keeps it as the largest choice', () => {
    const root = 'https://upload.wikimedia.org/wikipedia/commons';
    expect(wikimediaSrcset(`${root}/9/9f/Okapia_%2817zz%29.jpg`)).toBe(
      `${root}/thumb/9/9f/Okapia_%2817zz%29.jpg/250px-Okapia_%2817zz%29.jpg 250w, ` +
        `${root}/thumb/9/9f/Okapia_%2817zz%29.jpg/500px-Okapia_%2817zz%29.jpg 500w, ` +
        `${root}/9/9f/Okapia_%2817zz%29.jpg 1280w`,
    );
  });

  it('gives nothing for originals it cannot resize safely', () => {
    const root = 'https://upload.wikimedia.org/wikipedia/commons';
    expect(wikimediaSrcset(`${root}/9/9f/Okapia.svg`)).toBeNull();
    expect(wikimediaSrcset(`${root}/9/9f/Okapia.gif`)).toBeNull();
    expect(wikimediaSrcset('https://example.com/wikipedia/commons/9/9f/Okapia.jpg')).toBeNull();
  });

  it('gives nothing for other hosts and tiny thumbnails', () => {
    expect(wikimediaSrcset('https://example.com/thumb/a/1280px-a.jpg')).toBeNull();
    expect(wikimediaSrcset(`${base}250px-Axolotl_ganz.jpg`)).toBeNull();
    expect(wikimediaSrcset(null)).toBeNull();
  });
});

describe('sameName', () => {
  it('matches captions that only repeat a name', () => {
    expect(sameName(' giant huntsman Spider ', 'Giant Huntsman spider')).toBe(true);
    expect(sameName('Heteropoda maxima', 'Giant Huntsman spider', 'Heteropoda maxima')).toBe(true);
  });

  it('keeps real captions', () => {
    expect(sameName('Female with egg sac', 'Giant Huntsman spider')).toBe(false);
    expect(sameName('', 'Giant Huntsman spider')).toBe(false);
    expect(sameName(null, null)).toBe(false);
  });
});
