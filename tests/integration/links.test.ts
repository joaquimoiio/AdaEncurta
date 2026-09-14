import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET as listLinksRoute, POST as createLinkRoute } from "@/app/api/links/route";
import { DELETE as deleteLinkRoute, GET as getLinkRoute, PATCH as patchLinkRoute } from "@/app/api/links/[id]/route";
import { GET as qrRoute } from "@/app/api/links/[id]/qrcode/route";
import { createLink, deleteLink } from "@/server/links";
import { cleanupTestData, makeRequest, routeCtx, testActor, testCode } from "./helpers";

const ORIGIN = "http://localhost:3000";

describe("Criar link (API)", () => {
  beforeAll(cleanupTestData);
  afterAll(cleanupTestData);

  it("cria um link com código personalizado e retorna a URL curta", async () => {
    const code = testCode("custom");
    const res = await createLinkRoute(
      makeRequest(`${ORIGIN}/api/links`, {
        method: "POST",
        body: JSON.stringify({ originalUrl: "https://adanutraceuticos.com.br/products/creatina", code: code.toUpperCase(), title: "Creatina" }),
      }),
      routeCtx({}),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.code).toBe(code); // normalizado para minúsculas
    expect(body.shortUrl).toBe(`${ORIGIN}/${code}`);
    expect(body.clickCount).toBe(0);

    const db = await prisma.link.findUnique({ where: { code } });
    expect(db?.originalUrl).toBe("https://adanutraceuticos.com.br/products/creatina");

    const audit = await prisma.auditLog.findFirst({ where: { entityId: body.id, action: "link.create" } });
    expect(audit).not.toBeNull();
  });

  it("gera código automaticamente quando não informado", async () => {
    const link = await createLink({ originalUrl: "https://adanutraceuticos.com.br/", isActive: true }, testActor);
    expect(link.code).toMatch(/^[a-z0-9]{7}$/);
    // marca para limpeza
    await prisma.link.update({ where: { id: link.id }, data: { code: testCode("auto") } });
  });

  it("rejeita código duplicado com 409", async () => {
    const code = testCode("dup");
    await createLink({ originalUrl: "https://example.com/1", code, isActive: true }, testActor);
    const res = await createLinkRoute(
      makeRequest(`${ORIGIN}/api/links`, { method: "POST", body: JSON.stringify({ originalUrl: "https://example.com/2", code }) }),
      routeCtx({}),
    );
    expect(res.status).toBe(409);
  });

  it("valida URL e código com Zod (422)", async () => {
    const res = await createLinkRoute(
      makeRequest(`${ORIGIN}/api/links`, { method: "POST", body: JSON.stringify({ originalUrl: "http://localhost:8080/x", code: "admin" }) }),
      routeCtx({}),
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    const paths = body.issues.map((i: { path: string }) => i.path);
    expect(paths).toContain("originalUrl");
    expect(paths).toContain("code");
  });

  it("rejeita JSON inválido com 400", async () => {
    const res = await createLinkRoute(new Request(`${ORIGIN}/api/links`, { method: "POST", body: "{nope" }), routeCtx({}));
    expect(res.status).toBe(400);
  });

  it("lista, busca, edita, desativa e exclui", async () => {
    const code = testCode("crud");
    const created = await createLink({ originalUrl: "https://example.com/crud", code, title: "CRUD", isActive: true }, testActor);

    const list = await listLinksRoute(makeRequest(`${ORIGIN}/api/links?q=${code}`), routeCtx({}));
    expect(list.status).toBe(200);
    const listBody = await list.json();
    expect(listBody.total).toBe(1);
    expect(listBody.items[0].id).toBe(created.id);

    const get = await getLinkRoute(makeRequest(`${ORIGIN}/api/links/${created.id}`), routeCtx({ id: created.id }));
    expect(get.status).toBe(200);

    const patch = await patchLinkRoute(
      makeRequest(`${ORIGIN}/api/links/${created.id}`, { method: "PATCH", body: JSON.stringify({ title: "Editado", isActive: false, utmSource: "teste" }) }),
      routeCtx({ id: created.id }),
    );
    expect(patch.status).toBe(200);
    const patched = await patch.json();
    expect(patched.title).toBe("Editado");
    expect(patched.isActive).toBe(false);
    expect(patched.utmSource).toBe("teste");

    const del = await deleteLinkRoute(makeRequest(`${ORIGIN}/api/links/${created.id}`, { method: "DELETE" }), routeCtx({ id: created.id }));
    expect(del.status).toBe(200);

    const after = await getLinkRoute(makeRequest(`${ORIGIN}/api/links/${created.id}`), routeCtx({ id: created.id }));
    expect(after.status).toBe(404);

    // exclusão lógica: registro permanece com deletedAt e o código original fica livre
    const row = await prisma.link.findUnique({ where: { id: created.id } });
    expect(row?.deletedAt).not.toBeNull();
    expect(row?.code).not.toBe(code);
    const reuse = await createLink({ originalUrl: "https://example.com/again", code, isActive: true }, testActor);
    expect(reuse.code).toBe(code);
    await deleteLink(reuse.id, testActor);
  });

  it("gera QR Code em PNG e SVG", async () => {
    const link = await createLink({ originalUrl: "https://example.com/qr", code: testCode("qr"), isActive: true }, testActor);
    const png = await qrRoute(makeRequest(`${ORIGIN}/api/links/${link.id}/qrcode?format=png&size=256`), routeCtx({ id: link.id }));
    expect(png.status).toBe(200);
    expect(png.headers.get("content-type")).toBe("image/png");
    const bytes = new Uint8Array(await png.arrayBuffer());
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);

    const svg = await qrRoute(makeRequest(`${ORIGIN}/api/links/${link.id}/qrcode?format=svg&download=1`), routeCtx({ id: link.id }));
    expect(svg.status).toBe(200);
    expect(svg.headers.get("content-type")).toBe("image/svg+xml");
    expect(svg.headers.get("content-disposition")).toContain(`qrcode-${link.code}.svg`);
    expect(await svg.text()).toContain("<svg");
  });
});
