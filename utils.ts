// The most of this code is ported from https://deno.land/x/unknownutil@v1.1.0/mod.ts

// export type Predicate<T> = (value: unknown) => value is T;
export const isNone = (value: unknown): value is undefined | null =>
  value === null || value === undefined;

export const isString = (value: unknown): value is string =>
  typeof value === "string";

// export function isNumber(value: unknown): value is number {
//   return typeof value === "number";
// }
// export function isArray<T extends unknown>(
//   value: unknown,
//   predicate?: Predicate<T>,
// ): value is T[] {
//   return Array.isArray(value) && (!predicate || value.every(predicate));
// }

// export function ensureArray<T>(
//   value: unknown,
//   predicate?: Predicate<T>,
// ): asserts value is Array<T> {
//   if (isArray(value, predicate)) return;
//   throw TypeError("value must be an Array");
// }

export type OneByOneResult<T> = {
  state: "fulfilled";
  value: T;
} | {
  state: "rejected";
  reason: unknown;
};

/** Promiseを解決した順に返す函数 */
export async function* oneByOne<T>(
  promises: Iterable<Promise<T>>,
): AsyncGenerator<OneByOneResult<T>, void, unknown> {
  const queue = [] as OneByOneResult<T>[];
  let resolve: ((item: OneByOneResult<T>) => void) | undefined;
  const push = (item: OneByOneResult<T>) => {
    if (!resolve) {
      queue.push(item);
      return;
    }
    resolve(item);
    resolve = undefined;
  };
  const pop = () => {
    if (queue.length > 0) {
      return Promise.resolve(queue.pop()!);
    }
    return new Promise<OneByOneResult<T>>((res) => resolve = res);
  };

  let count = 0;
  for (const promise of promises) {
    promise
      .then((value) =>
        push({
          state: "fulfilled",
          value,
        })
      )
      .catch((reason) =>
        push({
          state: "rejected",
          reason,
        })
      );
    count++;
  }

  for (let i = 0; i < count; i++) {
    yield await pop();
  }
}
