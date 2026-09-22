/* 文節単位の改行制御。
 * コピーは "|" で文節に区切り、inline-blockのspanにして
 * 文節の途中で折り返さないようにする */
export function phrases(text: string) {
  return text.split("|").map((p, i) => (
    <span key={i} className="inline-block">
      {p}
    </span>
  ));
}
