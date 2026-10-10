import { describe, expect, test } from "vitest";
import { ShoppingCart } from "lucide-react";
import { DEFAULT_ICON, ICON_MAP, getIconComponent } from "../categoryIcons";

describe("getIconComponent", () => {
  test("一覧にあるアイコン名はそのアイコンを返す", () => {
    expect(getIconComponent("shopping-cart")).toBe(ShoppingCart);
  });

  test("一覧にないアイコン名は既定アイコンを返す", () => {
    expect(getIconComponent("unknown-icon")).toBe(ICON_MAP[DEFAULT_ICON]);
  });

  test("Object.prototype のプロパティ名は既定アイコンを返す", () => {
    for (const name of ["constructor", "toString", "__proto__"]) {
      expect(getIconComponent(name)).toBe(ICON_MAP[DEFAULT_ICON]);
    }
  });
});
