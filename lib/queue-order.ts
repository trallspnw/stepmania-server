export type ActiveQueueOrderEntry = {
  id: number;
  userId: number;
  status: "queued" | "playing";
};

export function insertIntoActiveQueueOrder(
  activeEntries: ActiveQueueOrderEntry[],
  newEntry: Pick<ActiveQueueOrderEntry, "id" | "userId">,
) {
  const playerOrder: number[] = [];

  for (const entry of activeEntries) {
    if (!playerOrder.includes(entry.userId)) {
      playerOrder.push(entry.userId);
    }
  }

  if (!playerOrder.includes(newEntry.userId)) {
    playerOrder.push(newEntry.userId);
  }

  const playerOrderIndex = new Map(playerOrder.map((userId, index) => [userId, index]));
  const occurrenceCounts = new Map<number, number>();
  const newOccurrence =
    activeEntries.filter((entry) => entry.userId === newEntry.userId).length + 1;
  const newPlayerIndex = playerOrderIndex.get(newEntry.userId) ?? playerOrder.length;
  let insertionIndex = 0;

  for (const [index, entry] of activeEntries.entries()) {
    const occurrence = (occurrenceCounts.get(entry.userId) ?? 0) + 1;
    occurrenceCounts.set(entry.userId, occurrence);

    const entryPlayerIndex = playerOrderIndex.get(entry.userId) ?? playerOrder.length;

    if (
      occurrence < newOccurrence ||
      (occurrence === newOccurrence && entryPlayerIndex <= newPlayerIndex)
    ) {
      insertionIndex = index + 1;
    }
  }

  return [
    ...activeEntries.slice(0, insertionIndex),
    { id: newEntry.id, userId: newEntry.userId, status: "queued" as const },
    ...activeEntries.slice(insertionIndex),
  ];
}

export function removeHeadFromActiveQueueOrder(activeEntries: ActiveQueueOrderEntry[]) {
  return activeEntries.slice(1);
}
