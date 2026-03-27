# RoomDaypart Composite Key Fix

## Problem Identified

The `roomDaypart.create()` operation was failing with error:
```
Query createOneRoomDaypart is required to return data, but found no record(s).
```

## Root Cause

**Schema Mismatch**: The Prisma schema didn't match the legacy database structure.

### Legacy Database Structure (Correct):
```sql
CREATE TABLE `room_dayparts` (
  `daypart_id` varchar(36) NOT NULL,
  `room_id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `start_date` datetime NOT NULL,
  PRIMARY KEY (`room_id`, `daypart_id`),  -- ← Composite Primary Key
  KEY `room_dayparts_daypart_id_index` (`daypart_id`)
);
```

**No separate `id` column** - uses composite PK on `(room_id, daypart_id)`.

### Prisma Schema (Wrong):
```prisma
model RoomDaypart {
  id        String   @id @default(uuid()) @db.VarChar(36)  // ← WRONG: Extra id column
  roomId    String   @map("room_id") @db.VarChar(36)
  daypartId String   @map("daypart_id") @db.VarChar(36)

  @@unique([roomId, daypartId])  // ← Redundant with composite PK
}
```

### Sync Code (Wrong):
```typescript
await prisma.roomDaypart.create({
  data: {
    id: `${room.id}-${daypartId}`,  // ← Trying to set id that doesn't exist in DB
    roomId: room.id,
    daypartId: daypartId,
  },
});
```

## The Issue

When Prisma tried to create a `RoomDaypart` record:
1. The `id` field was being set to a concatenated string like `"room-uuid-daypart-uuid"`
2. The database table has a composite PK on `(room_id, daypart_id)` with no `id` column
3. Prisma couldn't find the created record because it was looking for it by `id`, which doesn't exist in the actual table
4. Error: "Query createOneRoomDaypart is required to return data, but found no record(s)."

---

## Solution Applied

### 1. Fixed Prisma Schema

**File:** `backend/prisma/schema.prisma`

**Before (WRONG):**
```prisma
model RoomDaypart {
  id        String   @id @default(uuid()) @db.VarChar(36)
  roomId    String   @map("room_id") @db.VarChar(36)
  daypartId String   @map("daypart_id") @db.VarChar(36)

  room      Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  daypart   Daypart  @relation(fields: [daypartId], references: [id], onDelete: Cascade)

  @@unique([roomId, daypartId])
  @@index([roomId])
  @@index([daypartId])
  @@map("room_dayparts")
}
```

**After (CORRECT):**
```prisma
model RoomDaypart {
  roomId    String   @map("room_id") @db.VarChar(36)
  daypartId String   @map("daypart_id") @db.VarChar(36)

  room      Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  daypart   Daypart  @relation(fields: [daypartId], references: [id], onDelete: Cascade)

  @@id([roomId, daypartId])  // ← Composite Primary Key
  @@index([daypartId])
  @@map("room_dayparts")
}
```

**Changes:**
- ✅ Removed `id` field
- ✅ Removed `@@unique([roomId, daypartId])` (redundant with composite PK)
- ✅ Removed `@@index([roomId])` (redundant - first column of composite PK is automatically indexed)
- ✅ Added `@@id([roomId, daypartId])` - composite primary key

### 2. Fixed Sync Code

**File:** `backend/src/services/sync/base-data.sync.ts`

**Before (WRONG):**
```typescript
await prisma.roomDaypart.create({
  data: {
    id: `${room.id}-${daypartId}`,  // ← Remove this
    roomId: room.id,
    daypartId: daypartId,
  },
});
```

**After (CORRECT):**
```typescript
await prisma.roomDaypart.create({
  data: {
    roomId: room.id,
    daypartId: daypartId,
  },
});
```

**Changes:**
- ✅ Removed manual `id` assignment
- ✅ Prisma now uses the composite key `(roomId, daypartId)` as the identifier

---

## Manual Steps Required

### 1. Stop Backend Server
The Prisma client file is locked while the server is running.
```bash
# Stop the backend process (Ctrl+C)
```

### 2. Regenerate Prisma Client
```bash
cd suggestion/backend
npx prisma generate
```

**Expected Output:**
```
✔ Generated Prisma Client to ./node_modules/@prisma/client
```

### 3. Restart Backend Server
```bash
npm run dev
```

### 4. Test Base Data Sync
Trigger the sync via API to verify the fix:
```bash
curl -X POST http://localhost:3000/api/sync/base-data \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Expected Results After Fix

### Successful Sync Log:
```
[info]: Starting base data sync (Dayparts, Rooms, Spaces)
[info]: Syncing dayparts...
[info]: Fetched 106 items from dayparts
[info]: Synced 106 dayparts

[info]: Syncing rooms...
[info]: Fetched 18 items from rooms
[info]: Found 106 valid dayparts for room-daypart mapping validation
[info]: Synced 18 rooms with X room-daypart mappings (Y skipped)

[info]: Syncing spaces...
[info]: Fetched 37 items from spaces
[info]: Found 18 valid rooms for space validation
[info]: Synced 37 spaces (0 skipped)

[info]: Base data sync completed successfully
```

### Database Verification:
```sql
-- Check composite primary key
SHOW CREATE TABLE room_dayparts;
-- Should show: PRIMARY KEY (`room_id`,`daypart_id`)

-- Check room-daypart mappings
SELECT COUNT(*) FROM room_dayparts;
-- Should have multiple records

-- Check relationships
SELECT
  r.name AS room_name,
  COUNT(rd.daypart_id) AS daypart_count
FROM rooms r
LEFT JOIN room_dayparts rd ON rd.room_id = r.id
GROUP BY r.id, r.name;
-- Should show rooms with their daypart counts
```

---

## Why This Fix Works

### Before (BROKEN):
```
Prisma Schema:
  - Thinks table has id column
  - Tries to insert with id = "room-uuid-daypart-uuid"
  - After INSERT, tries to SELECT by id

Database:
  - Has composite PK (room_id, daypart_id)
  - No id column exists
  - INSERT may succeed or fail unpredictably
  - SELECT by id fails → Error
```

### After (FIXED):
```
Prisma Schema:
  - Knows table uses composite PK (roomId, daypartId)
  - Inserts only roomId and daypartId
  - After INSERT, selects by composite key

Database:
  - Has composite PK (room_id, daypart_id)
  - INSERT succeeds
  - SELECT by composite key succeeds → ✓
```

---

## Summary

The issue was a **schema mismatch** between Prisma and the actual database:
- Database uses composite PK `(room_id, daypart_id)` with no separate `id` column
- Prisma schema incorrectly defined a separate `id` column
- Sync code was trying to manually set this non-existent `id`
- Prisma couldn't retrieve the created record, causing the error

The fix aligns the Prisma schema with the legacy database structure by using a composite primary key.

---

## Files Modified

1. **`backend/prisma/schema.prisma`**
   - Changed `RoomDaypart` model to use composite PK
   - Removed `id` field
   - Removed redundant constraints

2. **`backend/src/services/sync/base-data.sync.ts`**
   - Removed `id` field from `roomDaypart.create()` data

---

## Verification Checklist

- [x] Schema updated to use composite primary key
- [x] Sync code updated to remove id field
- [x] Backend builds successfully
- [x] Database schema pushed (`npx prisma db push`)
- [ ] Backend server stopped (MANUAL)
- [ ] Prisma client regenerated (MANUAL - requires stopped server)
- [ ] Backend server restarted (MANUAL)
- [ ] Base data sync tested and completes successfully (MANUAL)
- [ ] 18 rooms with room-daypart mappings created (MANUAL)
