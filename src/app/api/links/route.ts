import { json, parseBody, parseQuery, withApi } from "@/lib/api";
import { LOCAL_ACTOR } from "@/lib/audit";
import { createLinkSchema, listLinksSchema } from "@/lib/validators/link";
import { createLink, listLinks } from "@/server/links";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req) => {
  const input = parseQuery(req, listLinksSchema);
  return json(await listLinks(input));
});

export const POST = withApi(async (req) => {
  const input = await parseBody(req, createLinkSchema);
  const link = await createLink(input, LOCAL_ACTOR);
  return json(link, { status: 201 });
});
