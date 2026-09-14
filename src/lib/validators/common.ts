import { z } from "zod";

export const utmSchema = z.object({
  utmSource: z.string().trim().max(200).optional().nullable(),
  utmMedium: z.string().trim().max(200).optional().nullable(),
  utmCampaign: z.string().trim().max(200).optional().nullable(),
  utmTerm: z.string().trim().max(200).optional().nullable(),
  utmContent: z.string().trim().max(200).optional().nullable(),
});

export const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

export const optionalDate = z.preprocess(
  emptyToNull,
  z.coerce.date().optional().nullable(),
);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const periodSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const idSchema = z.string().min(1).max(64);
