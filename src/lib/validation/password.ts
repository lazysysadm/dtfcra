import { z } from "zod";

// Offline check against common compromised passwords (no network at runtime).
const COMMON_COMPROMISED = new Set([
  "123456",
  "password",
  "123456789",
  "12345678",
  "12345",
  "qwerty",
  "1234567",
  "111111",
  "1234567890",
  "123123",
  "abc123",
  "password1",
  "iloveyou",
  "000000",
  "qwerty123",
  "1q2w3e",
  "admin",
  "welcome",
  "monkey",
  "dragon",
  "letmein",
  "azerty",
  "azerty123",
  "motdepasse",
  "bonjour",
  "soleil",
  "password123",
  "changeme",
  "p@ssw0rd",
  "passw0rd",
  "qwertyuiop",
  "football",
  "baseball",
  "master",
  "hello",
  "freedom",
  "whatever",
  "qazwsx",
  "trustno1",
  "batman",
  "superman",
  "1qaz2wsx",
  "123qwe",
  "zxcvbnm",
  "asdfgh",
  "asdfghjkl",
  "654321",
  "666666",
  "88888888",
  "121212",
  "0123456789",
  "123321",
  "159753",
  "147258369",
  "987654321",
  "102030",
  "112233",
  "010203",
  "123456a",
  "a123456",
  "abc123456",
  "123456789a",
  "1234567891",
  "password1234",
  "azertyuiop",
  "qwerty123456",
  "12345678910",
  "123456789012",
  "1234567890123",
]);

const SEQUENCE_PREFIXES = [
  "0123456789",
  "1234567890",
  "abcdefghijklmnopqrstuvwxyz",
  "azertyuiop",
  "qwertyuiop",
  "asdfghjkl",
];

export function isCompromisedPassword(password: string): boolean {
  const normalized = password.toLowerCase().trim();
  if (COMMON_COMPROMISED.has(normalized)) {
    return true;
  }
  if (/^(.)\1+$/.test(normalized)) {
    return true;
  }
  return SEQUENCE_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export const passwordSchema = z
  .string()
  .min(12, "Le mot de passe doit contenir au moins 12 caractères.")
  .max(128, "Le mot de passe ne peut pas dépasser 128 caractères.")
  .refine((value) => !isCompromisedPassword(value), {
    message: "Ce mot de passe est trop courant (liste de mots de passe compromis).",
  });
