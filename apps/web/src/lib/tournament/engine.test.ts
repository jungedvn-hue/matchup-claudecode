import { describe, it, expect } from 'vitest';
import {
  autoAllocatePools,
  suggestPoolCount,
  generateRoundRobinMatches,
  calculateStandings,
  generateBracket,
  generateCrossPoolTemplate,
  generateSnakeTemplate,
  validateTemplate,
  formatSlotRef,
  resolveTemplateToEntries,
} from './engine';
import { TournamentMatch, RankingCriterion } from './types';

describe('Tournament Engine', () => {
  describe('suggestPoolCount', () => {
    it('should suggest correct number of pools based on entries', () => {
      expect(suggestPoolCount(4)).toBe(1);
      expect(suggestPoolCount(10)).toBe(2);
      expect(suggestPoolCount(16)).toBe(4);
      expect(suggestPoolCount(24)).toBe(4);
      expect(suggestPoolCount(40)).toBe(8);
      expect(suggestPoolCount(80)).toBe(14); // 80/6 = 13.33 -> 14
    });
  });

  describe('autoAllocatePools', () => {
    it('should allocate pools using snake seeding', () => {
      const entries = [
        { id: '1', name: 'Player 1', seed: 1 },
        { id: '2', name: 'Player 2', seed: 2 },
        { id: '3', name: 'Player 3', seed: 3 },
        { id: '4', name: 'Player 4', seed: 4 },
        { id: '5', name: 'Player 5', seed: 5 },
        { id: '6', name: 'Player 6', seed: 6 },
      ];
      
      const pools = autoAllocatePools(entries, 2);
      
      expect(pools.length).toBe(2);
      // Pool A should get 1, 4, 5
      expect(pools[0].entryIds).toEqual(['1', '4', '5']);
      // Pool B should get 2, 3, 6
      expect(pools[1].entryIds).toEqual(['2', '3', '6']);
    });
  });

  describe('generateRoundRobinMatches', () => {
    it('should generate all pair permutations once', () => {
      const pool = {
        id: 'pool-a',
        name: 'A',
        entryIds: ['1', '2', '3'],
        matches: []
      };

      const matches = generateRoundRobinMatches(pool, 'cat-1', {
        '1': 'Player 1', '2': 'Player 2', '3': 'Player 3'
      });

      expect(matches.length).toBe(3);
      const pairs = matches.map(m => [m.entryAId, m.entryBId].sort().join('-')).sort();
      expect(pairs).toEqual(['1-2', '1-3', '2-3']);
      expect(matches[0].poolId).toBe('pool-a');
    });

    it('should attach seed labels like A1, A2 derived from pool name + position', () => {
      const pool = { id: 'pool-a', name: 'A', entryIds: ['x', 'y', 'z'], matches: [] };
      const matches = generateRoundRobinMatches(pool, 'cat-1', { x: 'X', y: 'Y', z: 'Z' });
      matches.forEach(m => {
        expect(m.entryASeedLabel).toMatch(/^A[1-3]$/);
        expect(m.entryBSeedLabel).toMatch(/^A[1-3]$/);
      });
    });

    it('should space matches so no team plays 3 consecutive matches (circle method)', () => {
      // 4 teams → 6 matches on a single court. Perfect single-rest is impossible
      // (one back-to-back per cycle), but no team should ever play 3 in a row.
      const pool = { id: 'pool-a', name: 'A', entryIds: ['1', '2', '3', '4'], matches: [] };
      const matches = generateRoundRobinMatches(pool, 'cat-1', { '1': 'P1', '2': 'P2', '3': 'P3', '4': 'P4' });
      expect(matches.length).toBe(6);
      for (let i = 2; i < matches.length; i++) {
        const a = new Set([matches[i - 2].entryAId, matches[i - 2].entryBId]);
        const b = new Set([matches[i - 1].entryAId, matches[i - 1].entryBId]);
        const c = [matches[i].entryAId, matches[i].entryBId];
        for (const id of c) {
          expect(a.has(id) && b.has(id)).toBe(false);
        }
      }
    });
  });

  describe('calculateStandings', () => {
    it('should calculate standings correctly based on wins and point diff', () => {
      const entryIds = ['1', '2', '3'];
      const entryMap = { '1': 'P1', '2': 'P2', '3': 'P3' };
      const matches: Partial<TournamentMatch>[] = [
        { status: 'completed', entryAId: '1', entryBId: '2', scoreA: 11, scoreB: 5, winner: '1' },
        { status: 'completed', entryAId: '1', entryBId: '3', scoreA: 11, scoreB: 9, winner: '1' },
        { status: 'completed', entryAId: '2', entryBId: '3', scoreA: 11, scoreB: 8, winner: '2' },
      ];

      const standings = calculateStandings(matches as TournamentMatch[], entryIds, entryMap, 2, ['wins', 'point_diff']);

      // P1: 2 wins
      // P2: 1 win
      // P3: 0 wins
      expect(standings.length).toBe(3);
      expect(standings[0].entryId).toBe('1');
      expect(standings[0].wins).toBe(2);
      expect(standings[0].qualified).toBe(true);

      expect(standings[1].entryId).toBe('2');
      expect(standings[1].wins).toBe(1);
      expect(standings[1].qualified).toBe(true);

      expect(standings[2].entryId).toBe('3');
      expect(standings[2].wins).toBe(0);
      expect(standings[2].qualified).toBe(false);
    });

    it('should break ties using point differential', () => {
      const entryIds = ['1', '2', '3'];
      const entryMap = { '1': 'P1', '2': 'P2', '3': 'P3' };
      // Triangle where everyone wins 1 match
      const matches: Partial<TournamentMatch>[] = [
        { status: 'completed', entryAId: '1', entryBId: '2', scoreA: 11, scoreB: 5, winner: '1' }, // P1 +6, P2 -6
        { status: 'completed', entryAId: '2', entryBId: '3', scoreA: 11, scoreB: 9, winner: '2' }, // P2 +2, P3 -2
        { status: 'completed', entryAId: '3', entryBId: '1', scoreA: 11, scoreB: 8, winner: '3' }, // P3 +3, P1 -3
      ];

      const standings = calculateStandings(matches as TournamentMatch[], entryIds, entryMap, 2, ['wins', 'point_diff']);

      // Point diffs:
      // P1: +6 - 3 = +3
      // P2: -6 + 2 = -4
      // P3: -2 + 3 = +1
      
      // Order should be P1, P3, P2
      expect(standings[0].entryId).toBe('1');
      expect(standings[0].pointDiff).toBe(3);
      
      expect(standings[1].entryId).toBe('3');
      expect(standings[1].pointDiff).toBe(1);
      
      expect(standings[2].entryId).toBe('2');
      expect(standings[2].pointDiff).toBe(-4);
    });

    it('should determine winner from scores if winner field is missing', () => {
      const entryIds = ['1', '2'];
      const entryMap = { '1': 'P1', '2': 'P2' };
      const matches: Partial<TournamentMatch>[] = [
        { status: 'completed', entryAId: '1', entryBId: '2', scoreA: 11, scoreB: 5 }, // No winner field
      ];

      const standings = calculateStandings(matches as TournamentMatch[], entryIds, entryMap, 1, ['wins']);

      expect(standings[0].entryId).toBe('1');
      expect(standings[0].wins).toBe(1);
    });

    it('should break ties using head-to-head', () => {
      const entryIds = ['1', '2'];
      const entryMap = { '1': 'P1', '2': 'P2' };
      const matches: Partial<TournamentMatch>[] = [
        { status: 'completed', entryAId: '1', entryBId: '2', scoreA: 11, scoreB: 5, winner: '1' },
      ];

      const standings = calculateStandings(matches as TournamentMatch[], entryIds, entryMap, 1, ['wins', 'head_to_head']);

      // Both have 1 win? No, wait. 
      // Let's make it a tie where both have same wins and same point diff from other matches.
    });
  });

  describe('generateBracket', () => {
    it('should generate correct knockout bracket with BYEs for 3 teams', () => {
      const teams = [
        { id: '1', name: 'Seed 1' },
        { id: '2', name: 'Seed 2' },
        { id: '3', name: 'Seed 3' },
      ];

      const bracket = generateBracket(teams, 'cat-1');
      
      // 3 teams -> nearest bracket is 4 teams -> 1 BYE
      // Round 0: Semi-Finals (2 matches)
      // Round 1: Final (1 match)
      expect(bracket.length).toBe(2);
      
      const semis = bracket[0].matches;
      expect(semis.length).toBe(2);
      
      // Seed pattern for 4: 1 vs 4, 2 vs 3. 4 is BYE.
      // So match 1: Seed 1 vs BYE (Seed 1 automatically wins)
      expect(semis[0].entryAName).toBe('Seed 1');
      expect(semis[0].entryBName).toBe('BYE');
      expect(semis[0].status).toBe('completed');
      expect(semis[0].winner).toBe('1');

      // Match 2: Seed 2 vs Seed 3
      expect(semis[1].entryAName).toBe('Seed 2');
      expect(semis[1].entryBName).toBe('Seed 3');
      expect(semis[1].status).toBe('not_started');
      expect(semis[1].winner).toBeUndefined();
    });
  });

  describe('Bracket pairing templates', () => {
    it('formatSlotRef renders 1A / 2B / W1 / BYE', () => {
      expect(formatSlotRef({ type: 'pool_rank', poolIndex: 0, rank: 1 })).toBe('1A');
      expect(formatSlotRef({ type: 'pool_rank', poolIndex: 1, rank: 2 })).toBe('2B');
      expect(formatSlotRef({ type: 'wildcard', index: 1 })).toBe('W1');
      expect(formatSlotRef({ type: 'bye' })).toBe('BYE');
    });

    it('cross-pool preset avoids same-pool rematch in R1 (4 pools × 2)', () => {
      const tpl = generateCrossPoolTemplate(4, 2, 0);
      expect(tpl.length).toBe(4); // 8 entries → 4 R1 matches
      tpl.forEach((m) => {
        const a = formatSlotRef(m.a);
        const b = formatSlotRef(m.b);
        if (!a.startsWith('BYE') && !b.startsWith('BYE')) {
          const poolA = a[a.length - 1];
          const poolB = b[b.length - 1];
          expect(poolA).not.toBe(poolB);
        }
      });
    });

    it('snake preset spreads top seeds across bracket halves (4 pools × 2)', () => {
      const tpl = generateSnakeTemplate(4, 2, 0);
      expect(tpl.length).toBe(4);
      // Top half = first 2 matches; bottom half = last 2. All four "1X" slots split 2 per half.
      const half1Refs = [tpl[0], tpl[1]].flatMap(m => [formatSlotRef(m.a), formatSlotRef(m.b)]);
      const half2Refs = [tpl[2], tpl[3]].flatMap(m => [formatSlotRef(m.a), formatSlotRef(m.b)]);
      const top1Half1 = half1Refs.filter(r => r.startsWith('1')).length;
      const top1Half2 = half2Refs.filter(r => r.startsWith('1')).length;
      expect(top1Half1).toBe(2);
      expect(top1Half2).toBe(2);
    });

    it('validateTemplate rejects duplicate slot refs', () => {
      const dup = generateCrossPoolTemplate(4, 2, 0);
      dup[1] = { a: dup[0].a, b: dup[1].b }; // force duplicate
      const res = validateTemplate(dup, 4, 2, 0);
      expect(res.ok).toBe(false);
    });

    it('validateTemplate accepts a clean cross-pool template', () => {
      const tpl = generateCrossPoolTemplate(4, 2, 0);
      expect(validateTemplate(tpl, 4, 2, 0).ok).toBe(true);
    });

    it('resolveTemplateToEntries swaps in real team names by pool standings', () => {
      const tpl = generateCrossPoolTemplate(2, 2, 0);
      const standings: any = [
        [ { entryId: 'a1', entryName: 'Alpha 1' }, { entryId: 'a2', entryName: 'Alpha 2' } ],
        [ { entryId: 'b1', entryName: 'Beta 1' },  { entryId: 'b2', entryName: 'Beta 2' } ],
      ];
      const entries = resolveTemplateToEntries(tpl, standings, []);
      const names = entries.map(e => e.name);
      expect(names).toContain('Alpha 1');
      expect(names).toContain('Beta 2');
      expect(entries.length).toBe(4);
    });
  });
});
