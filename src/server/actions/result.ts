import { z } from "zod";
import { logger } from "@/lib/logger";
import { DomainError } from "@/server/services/errors";

export type ActionResult =
  { success: true; updatedAt?: number } | { success: false; error: string };

const CODE_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Session expirée. Veuillez vous reconnecter.",
  FORBIDDEN: "Accès refusé.",
  NOT_FOUND: "Élément introuvable.",
  CONFLICT: "Opération impossible : élément lié à d'autres données ou verrouillé.",
  VALIDATION: "Données invalides.",
  RATE_LIMITED: "Trop de tentatives. Réessayez plus tard.",
  INTERNAL: "Erreur interne. Réessayez.",
};

const REASON_MESSAGES: Record<string, string> = {
  DAILY_CAP: "Total journalier dépassé : 1 jour maximum toutes missions confondues.",
  OUT_OF_MONTH: "Une journée saisie est hors du mois du CRA.",
  INVALID_QUANTITY: "Quantité invalide : 0, 0,25, 0,5 ou 1 jour (ou heures en mode heure).",
  STALE_VERSION: "Le CRA a été modifié ailleurs. Rechargez la page avant de continuer.",
  REAUTH_REQUIRED: "Action sensible : reconnectez-vous pour confirmer.",
  UNIT_CHANGE_WITH_ENTRIES:
    "Impossible de changer l'unité ou les heures/jour : des journées sont déjà saisies.",
};

export function fail(error: unknown): ActionResult {
  if (error instanceof DomainError) {
    const reason = error.reason ? REASON_MESSAGES[error.reason] : undefined;
    return { success: false, error: reason ?? CODE_MESSAGES[error.code] ?? "Erreur." };
  }
  if (error instanceof z.ZodError) {
    return { success: false, error: error.issues[0]?.message ?? "Données invalides." };
  }
  logger.error({ err: error }, "server action failed");
  return { success: false, error: "Erreur interne. Réessayez." };
}

export const idSchema = z.uuid();
