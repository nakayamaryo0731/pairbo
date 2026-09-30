import { IS_STAGING } from "./appEnv";

const ICON_DIR = IS_STAGING ? "/icons/staging" : "/icons";

// アイコン画像を差し替えたら上げる。同じURLのままだと端末側の旧Service Workerの
// precacheやAndroid PWA(WebAPK)が旧画像を使い続けるため、URLを変えて確実に再取得させる
const ICON_VERSION = 2;

export function iconUrl(file: string): string {
  return `${ICON_DIR}/${file}?v=${ICON_VERSION}`;
}
