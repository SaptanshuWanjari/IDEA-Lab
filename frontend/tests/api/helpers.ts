import axios, { AxiosHeaders, AxiosInstance, AxiosResponse } from "axios";

const BASE = process.env.TEST_API_URL || "http://localhost:8000";

function createClient(): AxiosInstance {
  const api = axios.create({ baseURL: BASE, withCredentials: true, validateStatus: () => true });
  return api;
}

interface AuthClient extends AxiosInstance {
  cookies: string;
}

function createAuthClient(): AuthClient {
  const api = axios.create({ baseURL: BASE, withCredentials: true, validateStatus: () => true }) as AuthClient;
  api.cookies = "";

  api.interceptors.response.use((res: AxiosResponse) => {
    const setCookie = res.headers["set-cookie"];
    if (setCookie) {
      const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
      for (const c of cookies) {
        const parts = c.split(";")[0];
        const [name, ...rest] = parts.split("=");
        if (name.trim() === "access_token" || name.trim() === "refresh_token") {
          api.cookies += `; ${name.trim()}=${rest.join("=")}`;
        }
      }
    }
    return res;
  });

  api.interceptors.request.use((config) => {
    if (api.cookies) {
      (config.headers as AxiosHeaders).set("Cookie", api.cookies.slice(2));
    }
    return config;
  });

  return api;
}

async function registerAndLogin(role = "admin") {
  const api = createAuthClient();
  const email = `test-${Date.now()}-${Math.random().toString(36).slice(2)}@pravah.local`;
  const reg = await api.post("/auth/register", { email, password: "test123", role });
  return { api, email, reg };
}

export { BASE, createClient, createAuthClient, registerAndLogin };
