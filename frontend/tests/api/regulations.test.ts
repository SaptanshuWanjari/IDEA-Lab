import { describe, it, expect } from "vitest";
import { createAuthClient, createClient, registerAndLogin } from "./helpers";

describe("POST /regulations/ (not yet implemented — auth gate only)", () => {
  it("returns 404 when unauthenticated (route not registered)", async () => {
    const api = createClient();
    const res = await api.post("/regulations/");
    expect(res.status).toBe(404);
  });

  it("returns 404 when authenticated (route not registered)", async () => {
    const { api } = await registerAndLogin();
    const res = await api.get("/regulations/");
    expect(res.status).toBe(404);
  });
});

describe("GET /maps/ (not yet implemented)", () => {
  it("returns 404 when unauthenticated (route not registered)", async () => {
    const api = createClient();
    const res = await api.get("/maps/");
    expect(res.status).toBe(404);
  });

  it("returns 404 when authenticated (route not registered)", async () => {
    const { api } = await registerAndLogin();
    const res = await api.get("/maps/");
    expect(res.status).toBe(404);
  });
});

describe("GET /reports/ (not yet implemented)", () => {
  it("returns 404 when unauthenticated (route not registered)", async () => {
    const api = createClient();
    const res = await api.get("/reports/any-id/report");
    expect(res.status).toBe(404);
  });
});
