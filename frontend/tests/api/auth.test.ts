import { describe, it, expect, beforeAll } from "vitest";
import { createAuthClient, createClient, registerAndLogin } from "./helpers";

describe("POST /auth/register", () => {
  it("registers a new user", async () => {
    const api = createAuthClient();
    const res = await api.post("/auth/register", {
      email: `reg-${Date.now()}@pravah.in`,
      password: "test123",
      role: "admin",
    });
    expect(res.status).toBe(201);
    expect(res.data).toHaveProperty("id");
    expect(res.data).toHaveProperty("email");
    expect(res.data.role).toBe("admin");
  });

  it("rejects duplicate email", async () => {
    const api = createAuthClient();
    const email = `dup-${Date.now()}@pravah.in`;
    await api.post("/auth/register", { email, password: "test123" });
    const res = await api.post("/auth/register", { email, password: "test123" });
    expect(res.status).toBe(400);
    expect(res.data.detail).toBe("Email already registered");
  });

  it("accepts any email-like string (no strict validation)", async () => {
    const api = createAuthClient();
    const res = await api.post("/auth/register", {
      email: `any-string-${Date.now()}`,
      password: "test123",
    });
    // ponytail: no EmailStr — .local TLD and test emails pass
    expect(res.status).toBe(201);
  });

  it("defaults role to department_manager", async () => {
    const api = createAuthClient();
    const res = await api.post("/auth/register", {
      email: `default-${Date.now()}@pravah.in`,
      password: "test123",
    });
    expect(res.status).toBe(201);
    expect(res.data.role).toBe("department_manager");
  });
});

describe("POST /auth/login", () => {
  let email = "";

  beforeAll(async () => {
    const api = createAuthClient();
    email = `login-${Date.now()}@pravah.in`;
    await api.post("/auth/register", { email, password: "correctpass" });
  });

  it("logs in with correct credentials", async () => {
    const api = createAuthClient();
    const res = await api.post("/auth/login", { email, password: "correctpass" });
    expect(res.status).toBe(200);
    expect(res.data.email).toBe(email);
  });

  it("rejects wrong password", async () => {
    const api = createAuthClient();
    const res = await api.post("/auth/login", { email, password: "wrongpass" });
    expect(res.status).toBe(401);
  });

  it("rejects nonexistent user", async () => {
    const api = createAuthClient();
    const res = await api.post("/auth/login", {
      email: "nobody@pravah.in",
      password: "nobody",
    });
    expect(res.status).toBe(401);
  });
});

describe("GET /auth/me", () => {
  it("returns current user when authenticated", async () => {
    const { api, email } = await registerAndLogin();
    const res = await api.get("/auth/me");
    expect(res.status).toBe(200);
    expect(res.data.email).toBe(email);
  });

  it("returns 401 without cookies", async () => {
    const api = createClient();
    // No cookies set — no interceptors needed
    const res = await api.get("/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("POST /auth/refresh", () => {
  it("refreshes tokens", async () => {
    const { api } = await registerAndLogin();
    const res = await api.post("/auth/refresh");
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty("id");
  });

  it("returns 401 without refresh cookie", async () => {
    const api = createClient();
    const res = await api.post("/auth/refresh");
    expect(res.status).toBe(401);
  });
});

describe("POST /auth/logout", () => {
  it("clears cookies and subsequent /me fails", async () => {
    const { api } = await registerAndLogin();
    // Verify authenticated first
    const me1 = await api.get("/auth/me");
    expect(me1.status).toBe(200);

    const logoutRes = await api.post("/auth/logout");
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.data.status).toBe("ok");

    // After logout, /me should fail
    const me2 = await api.get("/auth/me");
    expect(me2.status).toBe(401);
  });
});

describe("GET /health", () => {
  it("returns ok without auth", async () => {
    const api = createClient();
    const res = await api.get("/health");
    expect(res.status).toBe(200);
    expect(res.data.status).toBe("ok");
  });
});
