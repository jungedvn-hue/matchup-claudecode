import { describe, it, expect } from 'vitest';
import {
  autoAllocatePools,
  suggestPoolCount,
  generateRoundRobinMatches,
  calculateStandings,
  generateBracket,
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
    it('should generate all permutations for a pool', () => {
      const pool = {
        id: 'pool-a',
        name: 'A',
        entryIds: ['1', '2', '3'],
        matches: []
      };
      
      const matches = generateRoundRobinMatches(pool, 'cat-1', {
        '1': 'Player 1',
        '2': 'Player 2',
        '3': 'Player 3'
      });
      
      // 3 players = 3 matches (1v2, 1v3, 2v3)
      expect(matches.length).toBe(3);
      expect(matches[0].entryAId).toBe('1');
      expect(matches[0].entryBId).toBe('2');
      expect(matches[1].entryAId).toBe('1');
      expect(matches[1].entryBId).toBe('3');
      expect(matches[2].entryAId).toBe('2');
      expect(matches[2].entryBId).toBe('3');
      expect(matches[0].poolId).toBe('pool-a');
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
});
