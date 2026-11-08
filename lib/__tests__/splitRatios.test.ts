import { describe, expect, test } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";
import {
  equalRatioMap,
  firstPairRatio,
  toPairRatios,
  toRatioMap,
} from "../splitRatios";

const a = "a" as Id<"users">;
const b = "b" as Id<"users">;
const c = "c" as Id<"users">;

describe("equalRatioMap", () => {
  test("2人なら50:50", () => {
    expect(Array.from(equalRatioMap([a, b]).entries())).toEqual([
      [a, 50],
      [b, 50],
    ]);
  });

  test("割り切れない端数は先頭のメンバーに寄せる", () => {
    expect(Array.from(equalRatioMap([a, b, c]).values())).toEqual([34, 33, 33]);
  });
});

describe("toRatioMap", () => {
  test("保存済みの割合をメンバー順に並べる", () => {
    const map = toRatioMap(
      [
        { userId: b, ratio: 40 },
        { userId: a, ratio: 60 },
      ],
      [a, b],
    );
    expect(Array.from(map.entries())).toEqual([
      [a, 60],
      [b, 40],
    ]);
  });

  test("割合に含まれないメンバーは0%", () => {
    const map = toRatioMap(
      [
        { userId: a, ratio: 60 },
        { userId: b, ratio: 40 },
      ],
      [a, b, c],
    );
    expect(map.get(c)).toBe(0);
  });

  test("メンバーでないユーザーの割合は含めない", () => {
    const map = toRatioMap(
      [
        { userId: a, ratio: 60 },
        { userId: c, ratio: 40 },
      ],
      [a, b],
    );
    expect(Array.from(map.keys())).toEqual([a, b]);
  });
});

describe("firstPairRatio", () => {
  test("1人目の%を返す", () => {
    expect(
      firstPairRatio(
        [
          { userId: b, ratio: 30 },
          { userId: a, ratio: 70 },
        ],
        a,
      ),
    ).toBe(70);
  });

  test("未設定なら均等の50", () => {
    expect(firstPairRatio(undefined, a)).toBe(50);
  });
});

describe("toPairRatios", () => {
  test("1人目の%から2人分の割合を作る", () => {
    expect(toPairRatios(60, [a, b])).toEqual([
      { userId: a, ratio: 60 },
      { userId: b, ratio: 40 },
    ]);
  });

  test("50:50は未設定（null）として扱う", () => {
    expect(toPairRatios(50, [a, b])).toBeNull();
  });
});
