import { describe, expect, it } from 'vitest';
import { CONSTELLATIONS } from '../src/data/constellations.data';
import { BRIGHT_STARS } from '../src/data/brightStars.data';

describe('catálogo de constelaciones', () => {
  const starIds = new Set(BRIGHT_STARS.map((star) => star.id));

  it('tiene el set curado de 12 constelaciones', () => {
    expect(CONSTELLATIONS.length).toBe(12);
  });

  it('los ids de constelación son únicos', () => {
    const ids = CONSTELLATIONS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada línea referencia estrellas que existen en BRIGHT_STARS', () => {
    for (const constellation of CONSTELLATIONS) {
      for (const line of constellation.lines) {
        expect(starIds.has(line.fromStarId), `${constellation.id}: falta ${line.fromStarId}`).toBe(true);
        expect(starIds.has(line.toStarId), `${constellation.id}: falta ${line.toStarId}`).toBe(true);
      }
    }
  });

  it('cada labelStarId referencia una estrella existente', () => {
    for (const constellation of CONSTELLATIONS) {
      expect(starIds.has(constellation.labelStarId), `${constellation.id}: falta ancla ${constellation.labelStarId}`).toBe(true);
    }
  });

  it('cada constelación tiene al menos 2 líneas', () => {
    for (const constellation of CONSTELLATIONS) {
      expect(constellation.lines.length).toBeGreaterThanOrEqual(2);
    }
  });
});
