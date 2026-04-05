import { Property } from "@/types";

export function formatPrice(property: Property): string {
  if (property.dealType === "월세") {
    const deposit = property.deposit ?? 0;
    const monthly = property.monthlyRent ?? 0;
    return `${formatMoney(deposit)} / ${monthly}만`;
  }
  return formatMoney(property.price);
}

export function formatMoney(amount: number): string {
  if (amount >= 10000) {
    const eok = Math.floor(amount / 10000);
    const remainder = amount % 10000;
    if (remainder > 0) {
      return `${eok}억 ${remainder.toLocaleString()}만`;
    }
    return `${eok}억`;
  }
  return `${amount.toLocaleString()}만`;
}
