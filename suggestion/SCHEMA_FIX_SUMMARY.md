# Room/Space Relationship Fix Summary

## Problem Identified

The database schema and sync logic had the Room ↔ Space relationship **inverted**.

### Incorrect Understanding (Before):
```
Room → belongs to → Space
rooms.space_id → spaces.id
```

### Correct Understanding (After):
```
Space → belongs to → Room
spaces.room_id → rooms.id
```

**Reality**: Rooms are the primary object. Spaces are subdivisions of rooms.

Example:
- **Room**: "Main Ballroom"
- **Spaces**: "Main Ballroom - Section A", "Main Ballroom - Section B"

## Evidence from Legacy System

### 1. Legacy Spaces Table (`sql/8_spaces.sql`):
```sql
CREATE TABLE `spaces` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `room_id` varchar(36) NOT NULL,  -- ← FK to rooms!
  ...
  KEY `spaces_room_id_index` (`room_id`)
)
```

### 2. Legacy Rooms Table (`sql/6_rooms.sql`):
```sql
CREATE TABLE `rooms` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  ...
  -- No space_id column!
)
```

### 3. Legacy PHP Import (`import_spaces.php`):
```php
INSERT INTO spaces (id, name, room_id, ...) VALUES (?, ?, ?, ...);
                                 ^^^^^^^ from TTE API
```

### 4. TTE API Structure:
```typescript
interface TTESpace {
  id: string;
  name: string;
  room_id?: string;  // ← TTE provides room_id on spaces
}

interface TTERoom {
  id: string;
  name: string;
  // No space_id property
}
```

## Root Cause of Empty Rooms Table

The `syncRooms()` method was trying to find a matching space by name:

```typescript
const space = await prisma.space.findFirst({
  where: { name: room.name }
});

if (!space) {
  logger.warn(`No space found for room ${room.name}, skipping`);
  continue;  // ❌ ALL 18 ROOMS WERE SKIPPED!
}

await prisma.room.create({
  data: {
    spaceId: space.id,  // ❌ Wrong: rooms don't have space_id
    ...
  }
});
```

**Problem**: Spaces and rooms have different names, so no matches were found, and all rooms were skipped.

## Changes Made

### 1. Prisma Schema (`backend/prisma/schema.prisma`)

#### Before (WRONG):
```prisma
model Space {
  id      String @id
  name    String
  rooms   Room[]   // ❌ Implied Space has many Rooms
}

model Room {
  id       String @id
  spaceId  String @map("space_id")  // ❌ Room doesn't have space_id
  space    Space @relation(fields: [spaceId], references: [id])
}
```

#### After (CORRECT):
```prisma
model Space {
  id        String   @id @db.VarChar(36)
  name      String   @db.VarChar(255)
  roomId    String   @map("room_id") @db.VarChar(36)  // ✅ Added
  createdAt DateTime @default(now()) @map("date_created")
  updatedAt DateTime @updatedAt @map("date_updated")

  room      Room     @relation(fields: [roomId], references: [id])  // ✅ Added
  events    Event[]

  @@index([roomId])  // ✅ Added
  @@map("spaces")
}

model Room {
  id          String   @id @db.VarChar(36)
  name        String   @db.VarChar(255)
  capacity    Int?
  createdAt   DateTime @default(now()) @map("date_created")
  updatedAt   DateTime @updatedAt @map("date_updated")

  spaces      Space[]  // ✅ Added reverse relation
  events      Event[]
  roomDayparts RoomDaypart[]
  roomEventTypes RoomEventType[]

  @@map("rooms")
}
```

### 2. Sync Order (`backend/src/services/sync/base-data.sync.ts`)

#### Before (WRONG):
```
1. Spaces → 2. Dayparts → 3. Rooms
   ❌ Failed because rooms couldn't find spaces by name
```

#### After (CORRECT):
```
1. Dayparts → 2. Rooms → 3. Spaces
   ✅ Dayparts first (no dependencies)
   ✅ Rooms second (creates room-daypart mappings, needs dayparts)
   ✅ Spaces last (references rooms via room_id FK)
```

### 3. syncRooms() Method

#### Before (WRONG):
```typescript
// Find matching space by name (always failed)
const space = await prisma.space.findFirst({
  where: { name: room.name }
});

if (!space) {
  logger.warn(`No space found for room ${room.name}, skipping`);
  continue;  // ❌ Skipped all rooms
}

await prisma.room.create({
  data: {
    spaceId: space.id,  // ❌ Wrong FK
    ...
  }
});
```

#### After (CORRECT):
```typescript
// Create room directly (no space_id needed)
await prisma.room.create({
  data: {
    id: room.id,
    name: room.name,
    capacity: null,
    createdAt: new Date(room.date_created),
    updatedAt: new Date(room.date_updated),
  },
});
```

### 4. syncSpaces() Method

#### Before (WRONG):
```typescript
await prisma.space.create({
  data: {
    id: space.id,
    name: space.name,
    // ❌ Missing room_id
    createdAt: new Date(space.date_created),
    updatedAt: new Date(space.date_updated),
  },
});
```

#### After (CORRECT):
```typescript
// Validate room exists
const validRooms = await prisma.room.findMany({ select: { id: true } });
const validRoomIds = new Set(validRooms.map(r => r.id));

for (const space of spaces) {
  // Validate room_id exists
  if (!space.room_id || !validRoomIds.has(space.room_id)) {
    logger.warn(`Room ${space.room_id} not found for space ${space.name}, skipping`);
    skippedSpaces++;
    continue;
  }

  await prisma.space.create({
    data: {
      id: space.id,
      name: space.name,
      roomId: space.room_id,  // ✅ Use room_id from TTE API
      createdAt: new Date(space.date_created),
      updatedAt: new Date(space.date_updated),
    },
  });
}
```

## Dependency Chain (Correct)

```
dayparts (independent)
   ↓
rooms (independent, but room_dayparts needs dayparts)
   ↓
room_dayparts (depends on rooms + dayparts)
   ↓
spaces (depends on rooms via room_id)
   ↓
events (depends on rooms + spaces)
```

## Steps to Complete (Manual)

### 1. Stop the Backend Server
The Prisma client file is locked while the server is running.

```bash
# Stop the backend process (Ctrl+C or kill the process)
```

### 2. Regenerate Prisma Client
```bash
cd suggestion/backend
npx prisma generate
```

### 3. Push Schema Changes to Database
```bash
npx prisma db push
```

**Warning**: This will modify the `spaces` table:
- Drop the old `space_id` column from `rooms` table (if it exists)
- Add `room_id` column to `spaces` table
- **Data will be lost** - but that's okay, we'll re-sync from TTE API

### 4. Build Backend
```bash
npm run build
```

### 5. Start Backend Server
```bash
npm run dev
```

### 6. Test Base Data Sync
Trigger the base data sync via API:

```bash
curl -X POST http://localhost:3000/api/sync/base-data \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Expected Results After Fix

### Successful Sync Log:
```
[info]: Starting base data sync (Dayparts, Rooms, Spaces)
[info]: Syncing dayparts...
[info]: Fetching dayparts from TTE API
[info]: Fetched 106 items from dayparts
[info]: Clearing table: dayparts
[info]: Synced 106 dayparts

[info]: Syncing rooms...
[info]: Fetching rooms from TTE API
[info]: Fetched 18 items from rooms
[info]: Clearing table: room_dayparts
[info]: Clearing table: rooms
[info]: Found 106 valid dayparts for room-daypart mapping validation
[info]: Synced 18 rooms with X room-daypart mappings (Y skipped due to missing dayparts)

[info]: Syncing spaces...
[info]: Fetching spaces from TTE API
[info]: Fetched 37 items from spaces
[info]: Clearing table: spaces
[info]: Found 18 valid rooms for space validation
[info]: Synced 37 spaces (0 skipped due to missing/invalid room_id)
```

### Database Verification:
```sql
-- Check rooms (should have 18 records)
SELECT COUNT(*) FROM rooms;

-- Check spaces (should have 37 records with room_id populated)
SELECT COUNT(*), COUNT(room_id) FROM spaces;

-- Check room-space relationship
SELECT r.name AS room_name, COUNT(s.id) AS space_count
FROM rooms r
LEFT JOIN spaces s ON s.room_id = r.id
GROUP BY r.id, r.name;
```

## Files Modified

1. `suggestion/backend/prisma/schema.prisma`
   - Added `roomId` to Space model
   - Removed `spaceId` from Room model
   - Fixed relationship direction

2. `suggestion/backend/src/services/sync/base-data.sync.ts`
   - Reordered sync: Dayparts → Rooms → Spaces
   - Updated `syncRooms()` to remove space matching logic
   - Updated `syncSpaces()` to use `room_id` from TTE API with validation
   - Added validation to skip spaces with missing/invalid room_id

## Validation Checklist

- [x] Schema matches legacy database structure
- [x] Sync order respects FK dependencies
- [x] TTE API data structure correctly understood
- [x] Validation added for FK constraints
- [x] Graceful handling of missing references
- [x] Comprehensive logging for debugging
- [ ] Prisma client regenerated
- [ ] Database schema pushed
- [ ] Backend builds successfully
- [ ] Base data sync completes successfully
- [ ] 18 rooms populated
- [ ] 37 spaces populated with room_id
- [ ] Room-daypart mappings created
