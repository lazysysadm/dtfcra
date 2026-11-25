import { z } from "zod";
import { ENTRY_TYPES } from "@/lib/timesheet";

export const entrySchema = z.object({
  date: z.iso.date("Date invalide."),
  quantity: z.number().min(0).max(24),
  type: z.enum(ENTRY_TYPES),
  comment: z.string().max(500).optional().nullable(),
});

export const entriesSchema = z.array(entrySchema).max(31);

export type EntryInput = z.infer<typeof entrySchema>;
