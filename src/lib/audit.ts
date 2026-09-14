import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

/** Quem executou a ação. Não há login: o painel roda localmente e tudo é registrado como "local-admin". */
export type Actor = { label: string };
export const LOCAL_ACTOR: Actor = { label: "local-admin" };

export async function audit(
  actor: Actor,
  action: string,
  entityType: "Link" | "Campaign",
  entityId: string,
  metadata?: Prisma.InputJsonValue,
) {
  try {
    await prisma.auditLog.create({
      data: { actorLabel: actor.label, action, entityType, entityId, metadata },
    });
  } catch (err) {
    console.error("[audit] falha ao registrar:", err);
  }
}
