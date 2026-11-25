import { z } from "zod";
import { TERRITORIES } from "@/lib/holidays/territories";

export const territorySchema = z.enum(TERRITORIES);

export const LEGAL_FORMS = [
  "EI",
  "EURL",
  "SASU",
  "SAS",
  "SARL",
  "SA",
  "SNC",
  "Micro-entreprise",
  "Autre",
] as const;

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value && value.trim() !== "" ? value.trim() : null));

export const siretSchema = z
  .string()
  .regex(/^\d{14}$/, "Le SIRET doit contenir exactement 14 chiffres.");

export const vatNumberSchema = z
  .string()
  .regex(/^FR[A-Z0-9]{2}\d{9}$/, "Numéro de TVA invalide (format FRxxxxxxxxxxx).");

export const brandColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide (format #rrggbb).");

export const profileSchema = z.object({
  legalName: z.string().min(1, "La raison sociale est requise.").max(200),
  consultantName: z
    .string()
    .min(1, "Le nom prénom du collaborateur / consultant est requis.")
    .max(200),
  legalForm: z.enum(LEGAL_FORMS).optional().nullable(),
  siret: optionalText(14).refine((value) => value === null || /^\d{14}$/.test(value), {
    message: "Le SIRET doit contenir exactement 14 chiffres.",
  }),
  address: optionalText(500),
  vatNumber: optionalText(20).refine(
    (value) => value === null || /^FR[A-Z0-9]{2}\d{9}$/.test(value),
    { message: "Numéro de TVA invalide (format FRxxxxxxxxxxx)." },
  ),
  brandColor: brandColorSchema,
  holidayTerritory: territorySchema,
});

export const clientSchema = z.object({
  legalName: z.string().min(1, "La raison sociale est requise.").max(200),
  siret: optionalText(14).refine((value) => value === null || /^\d{14}$/.test(value), {
    message: "Le SIRET doit contenir exactement 14 chiffres.",
  }),
  address: optionalText(500),
  notes: optionalText(5000),
});

export const contactSchema = z.object({
  name: z.string().min(1, "Le nom est requis.").max(200),
  email: z.email("Adresse email invalide."),
  role: optionalText(100),
});

export const missionSchema = z
  .object({
    clientId: z.uuid("Client invalide."),
    title: z.string().min(1, "L'intitulé est requis.").max(200),
    startDate: z.iso.date("Date de début invalide."),
    endDate: z.iso.date("Date de fin invalide.").optional().nullable(),
    tjmCents: z.int("TJM invalide.").min(0).max(100_000_000),
    unit: z.enum(["day", "hour"]),
    hoursPerDay: z.number().min(0.5).max(24),
    holidayTerritory: territorySchema,
    status: z.enum(["active", "archived"]).default("active"),
  })
  .refine((value) => !value.endDate || value.endDate >= value.startDate, {
    message: "La date de fin doit être postérieure à la date de début.",
    path: ["endDate"],
  });

export type ProfileInput = z.infer<typeof profileSchema>;
export type ClientInput = z.infer<typeof clientSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type MissionInput = z.infer<typeof missionSchema>;
