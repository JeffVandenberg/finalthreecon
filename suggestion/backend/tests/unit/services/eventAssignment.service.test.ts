import { EventAssignmentService } from '../../../src/services/eventAssignment.service';

describe('EventAssignmentService', () => {
  let service: EventAssignmentService;

  beforeEach(() => {
    service = new EventAssignmentService();
  });

  describe('assignEventsIterative', () => {
    it('should assign users to events based on preferences', () => {
      const userPrefs = {
        user1: ['event1', 'event2'],
        user2: ['event1', 'event3'],
        user3: ['event2', 'event1'],
      };

      const capacities = {
        event1: 2,
        event2: 1,
        event3: 1,
      };

      const result = service.assignEventsIterative(userPrefs, capacities, 'alpha');

      // Verify all events are in result
      expect(result).toHaveProperty('event1');
      expect(result).toHaveProperty('event2');
      expect(result).toHaveProperty('event3');

      // Verify capacity constraints
      expect(result.event1.length).toBeLessThanOrEqual(2);
      expect(result.event2.length).toBeLessThanOrEqual(1);
      expect(result.event3.length).toBeLessThanOrEqual(1);

      // Verify total assignments
      const totalAssigned = Object.values(result).reduce(
        (sum, users) => sum + users.length,
        0
      );
      expect(totalAssigned).toBeGreaterThan(0);
    });

    it('should handle full capacity events', () => {
      const userPrefs = {
        user1: ['event1'],
        user2: ['event1'],
        user3: ['event1'],
      };

      const capacities = {
        event1: 1,
      };

      const result = service.assignEventsIterative(userPrefs, capacities, 'alpha');

      // Only 1 user should be assigned
      expect(result.event1.length).toBe(1);
    });

    it('should assign users to alternative events when first choice is full', () => {
      const userPrefs = {
        user1: ['event1', 'event2'],
        user2: ['event1', 'event2'],
      };

      const capacities = {
        event1: 1,
        event2: 1,
      };

      const result = service.assignEventsIterative(userPrefs, capacities, 'alpha');

      // Both users should get an assignment
      const totalAssigned = result.event1.length + result.event2.length;
      expect(totalAssigned).toBe(2);
    });

    it('should handle empty preferences', () => {
      const userPrefs = {};
      const capacities = {
        event1: 10,
      };

      const result = service.assignEventsIterative(userPrefs, capacities);

      expect(result.event1).toEqual([]);
    });

    it('should handle zero capacity events', () => {
      const userPrefs = {
        user1: ['event1'],
      };

      const capacities = {
        event1: 0,
      };

      const result = service.assignEventsIterative(userPrefs, capacities);

      expect(result.event1).toEqual([]);
    });

    it('should respect random tie-breaking', () => {
      const userPrefs = {
        user1: ['event1'],
        user2: ['event1'],
        user3: ['event1'],
      };

      const capacities = {
        event1: 2,
      };

      // Run multiple times to ensure randomness
      const results = [];
      for (let i = 0; i < 5; i++) {
        const result = service.assignEventsIterative(
          userPrefs,
          capacities,
          'random'
        );
        results.push(result.event1.sort().join(','));
      }

      // Should have exactly 2 users assigned each time
      results.forEach((result) => {
        expect(result.split(',').length).toBe(2);
      });
    });

    it('should respect alphabetical tie-breaking', () => {
      const userPrefs = {
        userC: ['event1'],
        userA: ['event1'],
        userB: ['event1'],
      };

      const capacities = {
        event1: 2,
      };

      const result = service.assignEventsIterative(userPrefs, capacities, 'alpha');

      // With alphabetical sorting, userA and userB should win
      expect(result.event1).toContain('userA');
      expect(result.event1).toContain('userB');
      expect(result.event1).not.toContain('userC');
    });

    it('should handle complex preference chains', () => {
      const userPrefs = {
        user1: ['event1', 'event2', 'event3'],
        user2: ['event1', 'event2', 'event3'],
        user3: ['event2', 'event3', 'event1'],
        user4: ['event3', 'event1', 'event2'],
      };

      const capacities = {
        event1: 1,
        event2: 1,
        event3: 2,
      };

      const result = service.assignEventsIterative(userPrefs, capacities, 'alpha');

      // All capacity should be used
      expect(result.event1.length).toBe(1);
      expect(result.event2.length).toBe(1);
      expect(result.event3.length).toBe(2);

      // All users should be assigned
      const allAssigned = [
        ...result.event1,
        ...result.event2,
        ...result.event3,
      ];
      expect(allAssigned.length).toBe(4);
      expect(new Set(allAssigned).size).toBe(4); // All unique
    });
  });
});
