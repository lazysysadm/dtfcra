import { z } from "zod";

// Cell references like "B2" or "AA10".
const cellSchema = z
  .string()
  .regex(/^[A-Z]{1,3}[1-9]\d{0,4}$/, "Référence de cellule invalide (ex. B2).");
const columnSchema = z.string().regex(/^[A-Z]{1,3}$/, "Colonne invalide (ex. A).");

// Simple mapping: where the export writes each piece of data in the client
// template. Days are written row by row starting at daysStartRow.
export const templateMappingSchema = z.object({
  freelancerNameCell: cellSchema.optional().nullable(),
  consultantNameCell: cellSchema.optional().nullable(),
  clientNameCell: cellSchema.optional().nullable(),
  missionTitleCell: cellSchema.optional().nullable(),
  periodCell: cellSchema.optional().nullable(),
  daysStartRow: z.int().min(1).max(10000),
  dateColumn: columnSchema,
  quantityColumn: columnSchema,
  typeColumn: columnSchema.optional().nullable(),
  commentColumn: columnSchema.optional().nullable(),
  totalDaysCell: cellSchema.optional().nullable(),
});

export type TemplateMapping = z.infer<typeof templateMappingSchema>;

export const DEFAULT_MAPPING: TemplateMapping = {
  freelancerNameCell: "B2",
  consultantNameCell: "B6",
  clientNameCell: "B3",
  missionTitleCell: "B4",
  periodCell: "B5",
  daysStartRow: 8,
  dateColumn: "A",
  quantityColumn: "B",
  typeColumn: "C",
  commentColumn: "D",
  totalDaysCell: "B40",
};

export const templateNameSchema = z.string().min(1).max(100);
