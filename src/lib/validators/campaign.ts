import { z } from "zod";
import { emptyToNull, optionalDate, paginationSchema, utmSchema } from "@/lib/validators/common";

export const campaignSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Use letras minúsculas, números e hífens.");

export const createCampaignSchema = utmSchema.extend({
  name: z.string().trim().min(2, "Informe o nome da campanha.").max(120),
  slug: z.preprocess(emptyToNull, campaignSlugSchema.optional().nullable()),
  description: z.preprocess(emptyToNull, z.string().trim().max(500).optional().nullable()),
  startsAt: optionalDate,
  endsAt: optionalDate,
  isActive: z.boolean().optional().default(true),
});

export const updateCampaignSchema = createCampaignSchema.partial();

export const listCampaignsSchema = paginationSchema.extend({
  q: z.string().trim().max(200).optional(),
  status: z.enum(["all", "active", "inactive"]).default("all"),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
