import { describe, expect, test } from "vitest";
import { buildMemberColorMap, MEMBER_COLORS } from "../userColors";

describe("buildMemberColorMap", () => {
  test("保存色がなければ joinedAt 順に既定色を割り当てる", () => {
    expect(buildMemberColorMap([{ userId: "a" }, { userId: "b" }])).toEqual({
      a: MEMBER_COLORS[0],
      b: MEMBER_COLORS[1],
    });
  });

  test("#RRGGBB 形式の保存色はそのまま使う", () => {
    expect(buildMemberColorMap([{ userId: "a", color: "#93c5fd" }])).toEqual({
      a: "#93c5fd",
    });
  });

  test("#RRGGBB 形式でない保存色は既定色に置き換える", () => {
    expect(
      buildMemberColorMap([
        { userId: "a" },
        {
          userId: "b",
          color:
            "red, red), url(https://example.com/a.png), linear-gradient(red, red",
        },
      ]),
    ).toEqual({ a: MEMBER_COLORS[0], b: MEMBER_COLORS[1] });
  });
});
