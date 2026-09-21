import { z } from "zod";
import { validateCustomCode } from "@/lib/short-code";
import { validateDestinationUrl } from "@/lib/url";
import { emptyToNull, optionalDate, paginationSchema, utmSchema } from "@/lib/validators/common";

const originalUrl = z
  .string()
  .trim()
  .min(1, "Informe a URL de destino.")
  .superRefine((value, ctx) => {
    const r = validateDestinationUrl(value);
    if (!r.ok) ctx.addIssue({ code: "custom", message: r.reason });
  })
  .transform((value) => {
    const r = validateDestinationUrl(value);
    return r.ok ? r.url : value;
  });

const customCode = z.preprocess(
  emptyToNull,
  z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      const r = validateCustomCode(value);
      if (!r.ok) ctx.addIssue({ code: "custom", message: r.reason });
    })
    .transform((value) => value.trim().toLowerCase())
    .optional()
    .nullable(),
);

export const createLinkSchema = utmSchema.extend({
  originalUrl,
  code: customCode,
  title: z.preprocess(emptyToNull, z.string().trim().max(160).optional().nullable()),
  description: z.preprocess(emptyToNull, z.string().trim().max(500).optional().nullable()),
  campaignId: z.preprocess(emptyToNull, z.string().max(64).optional().nullable()),
  expiresAt: optionalDate,
  inactiveTitle: z.preprocess(emptyToNull, z.string().trim().max(120).optional().nullable()),
  inactiveMessage: z.preprocess(emptyToNull, z.string().trim().max(500).optional().nullable()),
  isActive: z.boolean().optional().default(true),
});

export const updateLinkSchema = createLinkSchema.partial();

export const listLinksSchema = paginationSchema.extend({
  q: z.string().trim().max(200).optional(),
  campaignId: z.string().max(64).optional(),
  status: z.enum(["all", "active", "inactive"]).default("all"),
  sort: z.enum(["createdAt", "clickCount", "title"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateLinkInput = z.infer<typeof createLinkSchema>;
export type UpdateLinkInput = z.infer<typeof updateLinkSchema>;
export type ListLinksInput = z.infer<typeof listLinksSchema>;
