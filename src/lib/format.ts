/** 料金は税込の円で表示する（RexCarte のメニュー価格をそのまま表示する）。 */
export function formatPrice(yen: number): string {
  return `${yen.toLocaleString('ja-JP')}円（税込）`
}

/** 60 → "60分"、90 → "1時間30分"、120 → "2時間" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}分`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours}時間` : `${hours}時間${rest}分`
}
