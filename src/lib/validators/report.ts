import { z } from "zod";

export const reportFilterSchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    linkId: z.string().max(64).optional(),
    campaignId: z.string().max(64).optional(),
    includeBots: z
      .string()
      .optional()
      .transform((v) => v === "true" || v === "1"),
  })
  .transform((v) => {
    const to = v.to ?? new Date();
    const from = v.from ?? new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { ...v, from, to };
  })
  .refine((v) => v.from <= v.to, { message: "A data inicial deve ser anterior à final." });

export type ReportFilter = z.infer<typeof reportFilterSchema>;

export const exportSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  linkId: z.string().max(64).optional(),
  campaignId: z.string().max(64).optional(),
  type: z.enum(["clicks", "links"]).default("clicks"),
});
