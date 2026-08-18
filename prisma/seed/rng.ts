// Deterministic PRNG (mulberry32) so `db:reset` reproduces the identical demo dataset every run.
const SEED = 88172645;

// All "now"-relative seed data anchors to this fixed date rather than the
// real wall clock. Using `new Date()` here would make output depend on
// exactly when `db:reset` runs (e.g. whether a lead's SLA counts as
// breached shifts by execution time), which breaks the "reproduces the
// identical demo dataset every time" requirement.
export const SEED_NOW = new Date("2026-08-01T12:00:00.000Z");

function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng() {
  const random = mulberry32(SEED);

  return {
    next: () => random(),
    int: (min: number, max: number) => Math.floor(random() * (max - min + 1)) + min,
    float: (min: number, max: number, decimals = 2) => {
      const v = random() * (max - min) + min;
      const factor = 10 ** decimals;
      return Math.round(v * factor) / factor;
    },
    bool: (probabilityTrue = 0.5) => random() < probabilityTrue,
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(random() * arr.length)],
    pickMany: <T>(arr: readonly T[], count: number): T[] => {
      const pool = [...arr];
      const out: T[] = [];
      for (let i = 0; i < count && pool.length > 0; i++) {
        const idx = Math.floor(random() * pool.length);
        out.push(pool[idx]);
        pool.splice(idx, 1);
      }
      return out;
    },
    daysAgo: (max: number, min = 0) => {
      const days = Math.floor(random() * (max - min + 1)) + min;
      const d = new Date(SEED_NOW);
      d.setDate(d.getDate() - days);
      d.setHours(random() * 24, random() * 60, 0, 0);
      return d;
    },
    daysFromNow: (max: number, min = 0) => {
      const days = Math.floor(random() * (max - min + 1)) + min;
      const d = new Date(SEED_NOW);
      d.setDate(d.getDate() + days);
      d.setHours(random() * 24, random() * 60, 0, 0);
      return d;
    },
  };
}

export type Rng = ReturnType<typeof createRng>;
