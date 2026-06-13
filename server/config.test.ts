import { describe, expect, it, vi, afterEach } from "vitest";

describe("loadConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("throws when required env vars are missing", async () => {
    vi.stubEnv("APP_ENV", "");
    vi.stubEnv("DATABASE_PASSWORD", "");

    const { loadConfig } = await import("./config");

    expect(() => loadConfig()).toThrow("后端配置不完整");
    expect(() => loadConfig()).toThrow("DATABASE_PASSWORD");
  });

  it("loads config when all required env vars are set", async () => {
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("APP_PORT", "3000");
    vi.stubEnv("DATABASE_HOST", "localhost");
    vi.stubEnv("DATABASE_PORT", "3306");
    vi.stubEnv("DATABASE_NAME", "git_game");
    vi.stubEnv("DATABASE_USER", "root");
    vi.stubEnv("DATABASE_PASSWORD", "root");
    vi.stubEnv("DATABASE_POOL_MIN", "2");
    vi.stubEnv("DATABASE_POOL_MAX", "10");
    vi.stubEnv("JWT_SECRET", "test-secret");
    vi.stubEnv("JWT_EXPIRES_IN", "3600");
    vi.stubEnv("CORS_ORIGIN", "http://localhost:5173");

    const { loadConfig } = await import("./config");
    const config = loadConfig();

    expect(config.database.user).toBe("root");
    expect(config.database.password).toBe("root");
    expect(config.appPort).toBe(3000);
  });
});
