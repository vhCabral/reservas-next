import "server-only";
import { createHash } from "node:crypto";
import { enforce, reset } from "@/server/rate-limit/rate-limit";

const WINDOW_SECONDS = 15 * 60;
const IP_LIMIT = 20;
const PAIR_LIMIT = 5;

const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const ipKey = (ip: string) => `login:ip:${sha(ip)}`;
const pairKey = (ip: string, email: string) =>
  `login:pair:${sha(`${email}|${ip}`)}`;

export async function enforceLoginRateLimit(ip: string, email: string) {
  await enforce(ipKey(ip), IP_LIMIT, WINDOW_SECONDS);
  await enforce(pairKey(ip, email), PAIR_LIMIT, WINDOW_SECONDS);
}

export async function resetLoginPairLimit(ip: string, email: string) {
  await reset(pairKey(ip, email));
}
