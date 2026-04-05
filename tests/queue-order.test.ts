import test from "node:test";
import assert from "node:assert/strict";
import {
  insertIntoActiveQueueOrder,
  removeHeadFromActiveQueueOrder,
  type ActiveQueueOrderEntry,
} from "../lib/queue-order";

function buildQueue(
  playerSequence: string[],
  options?: { headPlaying?: boolean },
): ActiveQueueOrderEntry[] {
  return playerSequence.map((player, index) => ({
    id: index + 1,
    userId: player.charCodeAt(0) - 96,
    status: index === 0 && options?.headPlaying ? "playing" : "queued",
  }));
}

function toPlayerSequence(entries: ActiveQueueOrderEntry[]) {
  return entries.map((entry) => String.fromCharCode(entry.userId + 96));
}

for (const headPlaying of [false, true]) {
  const label = headPlaying ? "with playing head" : "with queued head";

  test(`empty queue: a adds -> a (${label})`, () => {
    const actual = insertIntoActiveQueueOrder(buildQueue([], { headPlaying }), {
      id: 99,
      userId: 1,
    });

    assert.deepEqual(toPlayerSequence(actual), ["a"]);
  });

  test(`a -> b adds -> a b (${label})`, () => {
    const actual = insertIntoActiveQueueOrder(buildQueue(["a"], { headPlaying }), {
      id: 99,
      userId: 2,
    });

    assert.deepEqual(toPlayerSequence(actual), ["a", "b"]);
  });

  test(`a a a -> b adds -> a b a a (${label})`, () => {
    const actual = insertIntoActiveQueueOrder(buildQueue(["a", "a", "a"], { headPlaying }), {
      id: 99,
      userId: 2,
    });

    assert.deepEqual(toPlayerSequence(actual), ["a", "b", "a", "a"]);
  });

  test(`a b c d a b d -> c adds -> a b c d a b c d (${label})`, () => {
    const actual = insertIntoActiveQueueOrder(
      buildQueue(["a", "b", "c", "d", "a", "b", "d"], { headPlaying }),
      {
        id: 99,
        userId: 3,
      },
    );

    assert.deepEqual(toPlayerSequence(actual), ["a", "b", "c", "d", "a", "b", "c", "d"]);
  });

  test(`head removal only: a b c d a b d -> b c d a b d (${label})`, () => {
    const actual = removeHeadFromActiveQueueOrder(
      buildQueue(["a", "b", "c", "d", "a", "b", "d"], { headPlaying }),
    );

    assert.deepEqual(toPlayerSequence(actual), ["b", "c", "d", "a", "b", "d"]);
  });

  test(`skip then fair add: a b c d a b d -> finish -> b c d a b d; c adds -> b c d a b c d (${label})`, () => {
    const afterFinish = removeHeadFromActiveQueueOrder(
      buildQueue(["a", "b", "c", "d", "a", "b", "d"], { headPlaying }),
    );
    const afterAdd = insertIntoActiveQueueOrder(afterFinish, {
      id: 99,
      userId: 3,
    });

    assert.deepEqual(toPlayerSequence(afterAdd), ["b", "c", "d", "a", "b", "c", "d"]);
  });

  test(`existing player keeps turn cadence: a b c d a b c -> d adds -> a b c d a b c d (${label})`, () => {
    const actual = insertIntoActiveQueueOrder(
      buildQueue(["a", "b", "c", "d", "a", "b", "c"], { headPlaying }),
      {
        id: 99,
        userId: 4,
      },
    );

    assert.deepEqual(toPlayerSequence(actual), ["a", "b", "c", "d", "a", "b", "c", "d"]);
  });
}
