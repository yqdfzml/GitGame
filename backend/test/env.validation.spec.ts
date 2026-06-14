import { describe, expect, it } from "vitest";
import { validateEnv } from "../src/config/env.validation";

describe("validateEnv", () => {
  /** 开发环境最小合法配置 */
  const baseDevConfig = {
    APP_ENV: "development",
    APP_PORT: "3000",
    DATABASE_URL: "mysql://root:root@localhost:3306/git_game",
    JWT_SECRET: "change-me-in-development",
    JWT_EXPIRES_IN: "1800",
    JWT_REFRESH_EXPIRES_IN: "2592000",
    CORS_ORIGIN: "http://localhost:5173",
    COOKIE_SECURE: "false",
  };

  it("开发环境允许本地默认 JWT 与 COOKIE_SECURE=false", () => {
    const config = validateEnv(baseDevConfig);
    expect(config.APP_ENV).toBe("development");
    expect(config.JWT_REFRESH_EXPIRES_IN).toBe(2592000);
    expect(config.COOKIE_SECURE).toBe(false);
  });

  it("生产环境拒绝弱 JWT_SECRET", () => {
    expect(() =>
      validateEnv({
        ...baseDevConfig,
        APP_ENV: "production",
        JWT_SECRET: "change-me-in-production-but-long-enough-32",
        COOKIE_SECURE: "true",
      }),
    ).toThrow("生产环境不得使用默认 JWT_SECRET");
  });

  it("生产环境拒绝 COOKIE_SECURE=false", () => {
    expect(() =>
      validateEnv({
        ...baseDevConfig,
        APP_ENV: "production",
        JWT_SECRET: "a-very-long-production-secret-key-32chars",
        COOKIE_SECURE: "false",
      }),
    ).toThrow("生产环境 COOKIE_SECURE 必须为 true");
  });

  it("缺少 JWT_REFRESH_EXPIRES_IN 时启动失败", () => {
    const { JWT_REFRESH_EXPIRES_IN, ...withoutRefresh } = baseDevConfig;
    expect(() => validateEnv(withoutRefresh)).toThrow("JWT_REFRESH_EXPIRES_IN");
  });
});
