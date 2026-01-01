/**
 * 共通フォーマット関数
 */

/**
 * 日付を MM/DD 形式にフォーマット
 * @example "2024-01-15" -> "1/15"
 */
export function formatDateShort(dateString: string): string {
  const [, month, day] = dateString.split("-");
  return `${parseInt(month)}/${parseInt(day)}`;
}

/**
 * 日付を 年月日 形式にフォーマット
 * @example "2024-01-15" -> "2024年1月15日"
 */
export function formatDateJapanese(dateString: string): string {
  const [year, month, day] = dateString.split("-");
  return `${year}年${parseInt(month)}月${parseInt(day)}日`;
}

/**
 * Date オブジェクトを YYYY-MM-DD 形式にフォーマット
 * @example new Date(2024, 0, 15) -> "2024-01-15"
 */
export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 金額をカンマ区切りでフォーマット
 * @example 12345 -> "12,345"
 */
export function formatAmount(amount: number): string {
  return amount.toLocaleString("ja-JP");
}

/**
 * タイムスタンプを日時形式でフォーマット
 * @example 1705312800000 -> "2024/1/15 12:00"
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/**
 * 期間を M/D〜M/D 形式でフォーマット
 * @example ("2024-01-01", "2024-01-31") -> "1/1〜1/31"
 */
export function formatPeriod(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return `${start.getMonth() + 1}/${start.getDate()}〜${end.getMonth() + 1}/${end.getDate()}`;
}

/**
 * 日付を YYYY/M/D 形式にフォーマット
 * @example "2024-01-15" -> "2024/1/15"
 */
export function formatDateSlash(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * 期間終了日から 年月分 形式のラベルを生成
 * @example "2024-01-25" -> "2024年1月分"
 */
export function formatPeriodLabel(endDate: string): string {
  const end = new Date(endDate);
  return `${end.getFullYear()}年${end.getMonth() + 1}月分`;
}

/**
 * 負担方法のラベルを取得
 */
export function getSplitMethodLabel(method: string): string {
  switch (method) {
    case "equal":
      return "均等分割";
    case "ratio":
      return "割合指定";
    case "amount":
      return "金額指定";
    case "full":
      return "全額負担";
    default:
      return method;
  }
}
