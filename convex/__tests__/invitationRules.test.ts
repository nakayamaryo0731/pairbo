import { describe, expect, test } from "vitest";
import {
  isInvitationExpired,
  isInvitationUsed,
  calculateExpiresAt,
  getInvitationErrorMessage,
  InvitationValidationError,
  INVITATION_RULES,
} from "../domain/invitation";

describe("invitation/rules", () => {
  describe("isInvitationExpired", () => {
    test("期限内はfalse", () => {
      const now = Date.now();
      const expiresAt = now + 1000; // 1秒後
      expect(isInvitationExpired(expiresAt, now)).toBe(false);
    });

    test("ちょうど期限はfalse（境界値）", () => {
      const now = Date.now();
      const expiresAt = now;
      expect(isInvitationExpired(expiresAt, now)).toBe(false);
    });

    test("期限切れはtrue", () => {
      const now = Date.now();
      const expiresAt = now - 1; // 1ミリ秒前
      expect(isInvitationExpired(expiresAt, now)).toBe(true);
    });

    test("nowを省略するとDate.now()を使用", () => {
      const futureExpires = Date.now() + 10000;
      expect(isInvitationExpired(futureExpires)).toBe(false);

      const pastExpires = Date.now() - 10000;
      expect(isInvitationExpired(pastExpires)).toBe(true);
    });
  });

  describe("isInvitationUsed", () => {
    test("未使用（undefined）はfalse", () => {
      expect(isInvitationUsed(undefined)).toBe(false);
    });

    test("使用済み（タイムスタンプあり）はtrue", () => {
      expect(isInvitationUsed(Date.now())).toBe(true);
      expect(isInvitationUsed(0)).toBe(true); // 0もタイムスタンプとして有効
    });
  });

  describe("calculateExpiresAt", () => {
    test("有効期限を正しく計算する", () => {
      const createdAt = 1000;
      const expirationMs = 7 * 24 * 60 * 60 * 1000; // 7日間
      expect(calculateExpiresAt(createdAt, expirationMs)).toBe(
        createdAt + expirationMs,
      );
    });

    test("INVITATION_RULES.EXPIRATION_MSと組み合わせて使用", () => {
      const now = Date.now();
      const expiresAt = calculateExpiresAt(now, INVITATION_RULES.EXPIRATION_MS);
      expect(expiresAt).toBe(now + 7 * 24 * 60 * 60 * 1000);
    });
  });

  describe("getInvitationErrorMessage", () => {
    test("invalid_tokenのメッセージ", () => {
      expect(getInvitationErrorMessage("invalid_token")).toBe(
        "無効な招待リンクです",
      );
    });

    test("expiredのメッセージ", () => {
      expect(getInvitationErrorMessage("expired")).toBe(
        "招待リンクの有効期限が切れています",
      );
    });

    test("already_usedのメッセージ", () => {
      expect(getInvitationErrorMessage("already_used")).toBe(
        "この招待リンクは既に使用されています",
      );
    });

    test("group_not_foundのメッセージ", () => {
      expect(getInvitationErrorMessage("group_not_found")).toBe(
        "グループが見つかりません",
      );
    });
  });

  describe("InvitationValidationError", () => {
    test("エラータイプとメッセージを保持する", () => {
      const error = new InvitationValidationError("expired", "期限切れです");
      expect(error.name).toBe("InvitationValidationError");
      expect(error.errorType).toBe("expired");
      expect(error.message).toBe("期限切れです");
    });

    test("Errorを継承している", () => {
      const error = new InvitationValidationError("invalid_token", "無効");
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("INVITATION_RULES", () => {
    test("定数が正しく定義されている", () => {
      expect(INVITATION_RULES.EXPIRATION_MS).toBe(7 * 24 * 60 * 60 * 1000);
    });
  });
});
