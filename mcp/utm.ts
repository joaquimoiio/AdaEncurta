/** Padroniza valores de UTM (minúsculas, sem acento/espaço) para os relatórios não fragmentarem. */
export function normalizeUtm(value: string | null | undefined): string | null | undefined {
  if (value === null || value === undefined) return value;
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.+-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
