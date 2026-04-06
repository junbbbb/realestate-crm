import { createHmac } from "crypto";

const PIN = "0641";
const SECRET = "crm-auth-secret-2026";

export function verifyToken(token: string): boolean {
  const [ts, sig] = token.split(".");
  if (!ts || !sig) return false;
  if (Date.now() - Number(ts) > 30 * 24 * 60 * 60 * 1000) return false;
  const expected = createHmac("sha256", SECRET).update(ts + PIN).digest("hex").slice(0, 16);
  return sig === expected;
}
