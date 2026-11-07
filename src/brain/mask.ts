/** NIK and phone numbers keep their last 4 digits; email keeps its domain. */
export function mask(text: string): string {
  return text
    .replace(/\b\d{12}(\d{4})\b/g, "************$1")
    .replace(/(?:\+62|\b62|\b0)[\s-]?8(?:[\s-]?\d){7,11}\b/g, keepLast4Digits)
    .replace(/[\w.+-]+@([\w-]+(?:\.[\w-]+)+)/g, "***@$1");
}

function keepLast4Digits(phone: string): string {
  let hidden = phone.replace(/\D/g, "").length - 4;
  return phone.replace(/\d/g, (digit) => (hidden-- > 0 ? "*" : digit));
}
