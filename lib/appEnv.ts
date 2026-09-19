import { APP_VERSION } from "./version";

// production release時のみversionが焼き込まれるため、v0.0.0 = staging/ローカル
// （lib/version.ts はデプロイワークフローが上書きするのでここに定数を置く）
// as string: 焼き込み後は APP_VERSION がリテラル型 "vX.Y.Z" に推論され、
// この比較が TS2367（型に重なりなし）でビルド失敗するのを防ぐ
export const IS_STAGING = (APP_VERSION as string) === "v0.0.0";
