"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getClientIp, requireUser } from "@/server/auth/helpers";
import { redirect } from "next/navigation";
import {
  getOrCreateTimesheet,
  clearMonth,
  copyPreviousMonth,
  fillWorkingDays,
  setEntries,
} from "@/server/services/timesheets";
import { fail, idSchema, type ActionResult } from "./result";

export type { ActionResult } from "./result";

function revalidateCra() {
  revalidatePath("/cra");
  revalidatePath("/");
}

async function currentIp() {
  return getClientIp(await headers());
}

export async function saveEntriesAction(
  timesheetId: string,
  entries: unknown,
  expectedUpdatedAt?: number,
): Promise<ActionResult> {
  try {
    const { user } = await requireUser();
    const updatedAt = await setEntries(
      user.id,
      idSchema.parse(timesheetId),
      entries,
      expectedUpdatedAt,
      await currentIp(),
    );
    revalidateCra();
    return { success: true, updatedAt };
  } catch (error) {
    return fail(error);
  }
}

export async function fillWorkingDaysAction(timesheetId: string): Promise<ActionResult> {
  try {
    const { user } = await requireUser();
    await fillWorkingDays(user.id, idSchema.parse(timesheetId), await currentIp());
    revalidateCra();
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

export async function copyPreviousMonthAction(timesheetId: string): Promise<ActionResult> {
  try {
    const { user } = await requireUser();
    await copyPreviousMonth(user.id, idSchema.parse(timesheetId), await currentIp());
    revalidateCra();
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

export async function clearMonthAction(timesheetId: string): Promise<ActionResult> {
  try {
    const { user } = await requireUser();
    await clearMonth(user.id, idSchema.parse(timesheetId), await currentIp());
    revalidateCra();
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

// Explicit creation of the month's CRA (GET pages never write).
export async function createTimesheetAction(
  missionId: string,
  year: number,
  month: number,
): Promise<void> {
  const { user } = await requireUser();
  const parsed = z
    .object({
      missionId: z.uuid(),
      year: z.number().int().min(2000).max(2100),
      month: z.number().int().min(1).max(12),
    })
    .parse({ missionId, year, month });
  await getOrCreateTimesheet(
    user.id,
    parsed.missionId,
    parsed.year,
    parsed.month,
    await currentIp(),
  );
  revalidateCra();
  redirect(
    `/cra?mission=${parsed.missionId}&ym=${parsed.year}-${String(parsed.month).padStart(2, "0")}`,
  );
}
