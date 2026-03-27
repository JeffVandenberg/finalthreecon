import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface UserPreferences {
  [userId: string]: string[]; // userId => ordered event IDs
}

interface EventCapacities {
  [eventId: string]: number;
}

interface AssignmentResult {
  [eventId: string]: string[]; // eventId => assigned user IDs
}

export class EventAssignmentService {
  /**
   * Iterative event-centric assignment with "promotion" of preferences.
   * Ensures each user only gets assigned to each event once.
   */
  assignEventsIterative(
    userPrefs: UserPreferences,
    capacities: EventCapacities,
    tieBreak: 'random' | 'alpha' = 'random'
  ): AssignmentResult {
    // Mutable copies of inputs
    const remainingPrefs: UserPreferences = {};
    for (const [user, prefs] of Object.entries(userPrefs)) {
      remainingPrefs[user] = [...prefs];
    }

    const remainingCaps = { ...capacities };
    const eventAssignments: AssignmentResult = {};
    for (const eventId of Object.keys(capacities)) {
      eventAssignments[eventId] = [];
    }

    // Active users (those with at least one remaining preference)
    let active = Object.keys(remainingPrefs).filter(user => remainingPrefs[user].length > 0);

    while (active.length > 0) {
      // Bucket users by their current top preference
      const buckets: { [eventId: string]: string[] } = {};
      for (const user of active) {
        if (remainingPrefs[user].length === 0) continue;
        const top = remainingPrefs[user][0];
        if (!buckets[top]) buckets[top] = [];
        buckets[top].push(user);
      }

      if (Object.keys(buckets).length === 0) break;

      // Process each event bucket
      for (const [eventId, contenders] of Object.entries(buckets)) {
        const seats = remainingCaps[eventId] || 0;

        // No seats left? All contenders drop this event
        if (seats <= 0) {
          for (const user of contenders) {
            remainingPrefs[user].shift();
          }
          continue;
        }

        // Tie-break among contenders
        if (tieBreak === 'random') {
          contenders.sort(() => Math.random() - 0.5);
        } else {
          contenders.sort();
        }

        // Winners vs losers
        const winners = contenders.slice(0, seats);
        const losers = contenders.slice(seats);

        // Assign winners and remove this event from their prefs
        for (const user of winners) {
          eventAssignments[eventId].push(user);
          remainingCaps[eventId]--;
          remainingPrefs[user].shift();
        }

        // Losers drop this event from their prefs
        for (const user of losers) {
          remainingPrefs[user].shift();
        }
      }

      // Update active users list
      active = Object.keys(remainingPrefs).filter(user => remainingPrefs[user].length > 0);
    }

    return eventAssignments;
  }

  /**
   * Run event assignment for a set of badges and their preferences
   */
  async runEventAssignment(preferences: { badgeId: string; eventIds: string[] }[]) {
    // Build user preferences map
    const userPrefs: UserPreferences = {};
    for (const pref of preferences) {
      userPrefs[pref.badgeId] = pref.eventIds;
    }

    // Get event capacities
    const events = await prisma.event.findMany({
      where: {
        id: {
          in: preferences.flatMap(p => p.eventIds)
        }
      }
    });

    const capacities: EventCapacities = {};
    for (const event of events) {
      const capacity = event.customFields && typeof event.customFields === 'object'
        ? (event.customFields as any).capacity
        : 999;
      capacities[event.id] = capacity;
    }

    // Run assignment algorithm
    const assignments = this.assignEventsIterative(userPrefs, capacities, 'random');

    // Create tickets in database
    const ticketsToCreate: Array<{ badgeId: string; eventId: string; relationships: any }> = [];
    for (const [eventId, badgeIds] of Object.entries(assignments)) {
      for (const badgeId of badgeIds) {
        ticketsToCreate.push({
          badgeId,
          eventId,
          relationships: {}
        });
      }
    }

    // Bulk create tickets
    await prisma.ticket.createMany({
      data: ticketsToCreate,
      skipDuplicates: true
    });

    return assignments;
  }
}
