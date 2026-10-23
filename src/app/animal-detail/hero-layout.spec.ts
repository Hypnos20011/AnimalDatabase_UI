import { OVERLAY_MIN_RATIO, heroLayout } from './hero-layout';

describe('heroLayout', () => {
  it('overlays the name on wide photos', () => {
    expect(heroLayout(1280, 853)).toBe('overlay');
    expect(heroLayout(1920, 1080)).toBe('overlay');
    expect(heroLayout(3000, 800)).toBe('overlay');
  });

  it('puts the name beside portrait photos', () => {
    expect(heroLayout(1000, 1348)).toBe('side');
    expect(heroLayout(600, 1200)).toBe('side');
  });

  it('puts the name beside square and near-square photos', () => {
    expect(heroLayout(1000, 1000)).toBe('side');
    expect(heroLayout(1200, 1000)).toBe('side');
  });

  it('switches to overlay exactly at the threshold ratio', () => {
    expect(heroLayout(OVERLAY_MIN_RATIO * 1000, 1000)).toBe('overlay');
    expect(heroLayout(OVERLAY_MIN_RATIO * 1000 - 1, 1000)).toBe('side');
  });

  it('stays pending while the size is unknown', () => {
    expect(heroLayout(null, null)).toBe('pending');
    expect(heroLayout(undefined, 500)).toBe('pending');
    expect(heroLayout(0, 0)).toBe('pending');
    expect(heroLayout(800, 0)).toBe('pending');
    expect(heroLayout(-5, 100)).toBe('pending');
  });
});
