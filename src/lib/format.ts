import { Property } from "@/types";

export function formatPrice(property: Property): string {
  if (property.dealType === "월세") {
    const deposit = property.deposit ?? 0;
    const monthly = property.monthlyRent ?? 0;
    return `${formatMoney(deposit)} / ${formatMoney(monthly)}`;
  }
  return formatMoney(property.price);
}

/** 원 단위 금액을 한글 표기로 변환 */
export function formatMoney(amount: number): string {
  if (amount === 0) return "0";

  // 만원 단위로 변환
  const man = Math.round(amount / 10000);

  if (man >= 10000) {
    const eok = Math.floor(man / 10000);
    const remainder = man % 10000;
    if (remainder > 0) {
      return `${eok}억 ${remainder.toLocaleString()}만`;
    }
    return `${eok}억`;
  }
  if (man > 0) {
    return `${man.toLocaleString()}만`;
  }
  return `${amount.toLocaleString()}원`;
}
