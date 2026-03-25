# Queue

This document captures the current planned queue behavior for the shared play order.

The queue is not intended to be a strict FIFO list. It is an ordered shared playlist with fairness rules.

## Core Model

The queue should be database-backed.

Rationale:

- queue state matters to multiple users
- queue state should survive restarts and deploys
- ordering is dynamic and needs to be recomputed safely
- the machine/current-song workflow will depend on durable queue state

An in-memory queue is not sufficient for the intended behavior.

## Behavioral Goal

Songs should generally play in turns across participating players.

Desired pattern:

- `A, B, C, A, B, C`

But the queue must remain flexible when players add songs at different times.

Examples:

- If player `A` adds three songs before anyone else, those songs may temporarily occupy the front of the queue.
- If player `B` later adds a song, it should be inserted into the next fair turn rather than always being appended to the very end.
- If player `C` is slow to add, the queue may look like `A, B, A, B, C`.
- If a player takes a break and returns later, the queue may naturally rebalance into a different turn order such as `A, C, B, A, C, B`.

The goal is fairness over time, not a rigid static rotation.

## Scheduling Rule

The recommended model is:

- preserve each player's own submission order
- interleave players fairly in the global play order

This means:

- each player has a personal ordered list of pending submissions
- the global queue is produced by round-robin across players who currently have pending entries

Within a single player's queue:

- first queued remains first played

Across players:

- one song per player per round whenever possible

## Recommended Ordering Algorithm

When queue membership changes, recompute the queued play order transactionally.

Suggested algorithm:

1. Load all queued entries.
2. Group entries by player.
3. Sort each player's entries by submission time.
4. Determine player order by the earliest still-pending queued item they have.
5. Build the global queue by taking one entry from each player in turn.
6. Repeat until all queued entries are assigned a play order.

This gives:

- fairness across players
- stable ordering within each player's own submissions
- graceful handling of late joins
- graceful handling of players becoming inactive and returning later

## Important Design Choice

Do not try to insert a new song into the queue using a narrow local rule such as "find one slot and splice."

Instead:

- treat the queue as a derived ordered list
- recompute the full queued order whenever queued membership changes

At the expected scale, full reorder-on-change is simpler and safer than maintaining complex local insertion logic.

## Suggested Data Model Direction

The queue should use its own table, not `Setting`.

Expected queue unit:

- `song + chart + user`

Suggested fields:

- `id`
- `userId`
- `songId`
- `chartId`
- `createdAt`
- `playOrder`
- `status`

Minimal status set:

- `queued`
- `playing`

At present, history-specific statuses such as `skipped` or `removed` are not required.

## Explicit Non-Goals For Now

- persistent queue history
- skip audit trail
- removed-entry audit trail
- advanced scoring or moderation rules

Those can be added later if the product grows into them.

## Working Assumptions

- first queued should still matter
- per-player submission order should be preserved
- fairness is more important than strict append order
- queue behavior should tolerate arbitrary player join/leave timing
- queue state should be durable

## Confirmed Defaults

- active player means any user who currently has queued entries
- only entries with status `queued` participate in queue reordering
- the current `playing` item, when present, is not moved by reorder operations
- duplicate `song + chart` submissions are allowed
- users can remove their own queued entries
- admins can remove any queued entry through API-level permissions
- the queued tail should be fully recomputed after every add, remove, or advance operation
- explicit integer `playOrder` should be stored on queue entries

## Permissions

Current intended permissions:

- any signed-in user can add songs to the queue
- any signed-in user can remove their own queued songs
- admins can remove any queued song

The dashboard UI does not need to expose admin-only removal controls yet. API permissions should still allow future admin queue tools.

## Implementation Notes

When queue work starts, the next design step should define:

- the Prisma model for queue entries
- the queue reorder transaction
- the API surface for add, remove, advance, and current queue view
- how the queue integrates with current-song machine state
