"use server";

import { revalidatePath } from "next/cache";
import {
  clientSchema,
  contactSchema,
  missionSchema,
  profileSchema,
} from "@/lib/validation/referential";
import { requireUser } from "@/server/auth/helpers";
import { createClient, deleteClient, updateClient } from "@/server/services/clients";
import { createContact, deleteContact, updateContact } from "@/server/services/contacts";
import {
  createMission,
  deleteMission,
  setMissionStatus,
  updateMission,
} from "@/server/services/missions";
import { upsertProfile } from "@/server/services/profile";
import { fail, idSchema, type ActionResult } from "./result";

export type { ActionResult } from "./result";

export async function saveProfile(input: unknown): Promise<ActionResult> {
  try {
    const { user } = await requireUser();
    await upsertProfile(user.id, profileSchema.parse(input));
    revalidatePath("/settings/profile");
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

export async function createClientAction(input: unknown): Promise<ActionResult> {
  try {
    const { user } = await requireUser();
    await createClient(user.id, clientSchema.parse(input));
    revalidatePath("/clients");
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

export async function updateClientAction(clientId: string, input: unknown): Promise<ActionResult> {
  try {
    const { user } = await requireUser();
    await updateClient(user.id, idSchema.parse(clientId), clientSchema.parse(input));
    revalidatePath("/clients", "layout");
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteClientAction(clientId: string): Promise<ActionResult> {
  try {
    const { user } = await requireUser();
    await deleteClient(user.id, idSchema.parse(clientId));
    revalidatePath("/clients", "layout");
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

export async function createContactAction(clientId: string, input: unknown): Promise<ActionResult> {
  try {
    const { user } = await requireUser();
    await createContact(user.id, idSchema.parse(clientId), contactSchema.parse(input));
    revalidatePath("/clients", "layout");
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

export async function updateContactAction(
  clientId: string,
  contactId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const { user } = await requireUser();
    await updateContact(user.id, idSchema.parse(contactId), contactSchema.parse(input));
    revalidatePath("/clients", "layout");
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteContactAction(contactId: string): Promise<ActionResult> {
  try {
    const { user } = await requireUser();
    await deleteContact(user.id, idSchema.parse(contactId));
    revalidatePath("/clients", "layout");
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

export async function createMissionAction(input: unknown): Promise<ActionResult> {
  try {
    const { user } = await requireUser();
    await createMission(user.id, missionSchema.parse(input));
    revalidatePath("/missions");
    revalidatePath("/clients", "layout");
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

export async function updateMissionAction(
  missionId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const { user } = await requireUser();
    await updateMission(user.id, idSchema.parse(missionId), missionSchema.parse(input));
    revalidatePath("/missions");
    revalidatePath("/clients", "layout");
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

export async function setMissionStatusAction(
  missionId: string,
  status: "active" | "archived",
): Promise<ActionResult> {
  try {
    const { user } = await requireUser();
    await setMissionStatus(user.id, idSchema.parse(missionId), status);
    revalidatePath("/missions");
    revalidatePath("/clients", "layout");
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteMissionAction(missionId: string): Promise<ActionResult> {
  try {
    const { user } = await requireUser();
    await deleteMission(user.id, idSchema.parse(missionId));
    revalidatePath("/missions");
    revalidatePath("/clients", "layout");
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}
