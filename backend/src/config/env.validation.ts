/**
 * 解析必填正整数环境变量。
 * 功能：启动期校验，避免 NaN 或非法值进入运行时。
 * 参数：rawValue - 原始环境变量；name - 变量名（用于报错）。
 * 返回值：正整数。
 */
const parseRequiredPositiveInt = (rawValue: unknown, name: string): number => {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    throw new Error(`缺少必填环境变量: ${name}`);
  }

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} 必须为正整数`);
  }

  return parsed;
};

/** 校验通过后的环境配置 */
export interface ValidatedEnvConfig {
  APP_ENV: "development" | "production";
  APP_PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: number;
  JWT_REFRESH_EXPIRES_IN: number;
  CORS_ORIGIN: string;
  COOKIE_SECURE: boolean;
  UPLOAD_ROOT: string;
  AVATAR_UPLOAD_DIR: string;
  AVATAR_MAX_SIZE: number;
}

/**
 * 启动时校验环境变量。
 * 功能：生产环境拒绝弱密钥与不安全 Cookie；开发环境允许本地默认值。
 * 参数：config - ConfigModule 读取的原始配置。
 * 返回值：类型明确的配置对象；不合法时抛出 Error 阻止启动。
 */
export const validateEnv = (config: Record<string, unknown>): ValidatedEnvConfig => {
  const appEnv = config.APP_ENV;
  if (appEnv !== "development" && appEnv !== "production") {
    throw new Error("APP_ENV 必须为 development 或 production");
  }

  const databaseUrl = config.DATABASE_URL;
  if (typeof databaseUrl !== "string" || databaseUrl === "") {
    throw new Error("缺少必填环境变量: DATABASE_URL");
  }

  const jwtSecret = config.JWT_SECRET;
  if (typeof jwtSecret !== "string" || jwtSecret === "") {
    throw new Error("缺少必填环境变量: JWT_SECRET");
  }

  if (appEnv === "production") {
    if (jwtSecret.length < 32) {
      throw new Error("生产环境 JWT_SECRET 长度至少 32 字符");
    }
    if (jwtSecret.includes("change-me")) {
      throw new Error("生产环境不得使用默认 JWT_SECRET");
    }
  }

  const cookieSecureRaw = config.COOKIE_SECURE;
  if (cookieSecureRaw !== "true" && cookieSecureRaw !== "false") {
    throw new Error("COOKIE_SECURE 必须为 true 或 false");
  }
  const cookieSecure = cookieSecureRaw === "true";

  if (appEnv === "production" && !cookieSecure) {
    throw new Error("生产环境 COOKIE_SECURE 必须为 true");
  }

  const corsOrigin = config.CORS_ORIGIN;
  if (typeof corsOrigin !== "string" || corsOrigin === "") {
    throw new Error("缺少必填环境变量: CORS_ORIGIN");
  }

  const uploadRoot =
    typeof config.UPLOAD_ROOT === "string" && config.UPLOAD_ROOT !== ""
      ? config.UPLOAD_ROOT
      : "./uploads";
  const avatarUploadDir =
    typeof config.AVATAR_UPLOAD_DIR === "string" && config.AVATAR_UPLOAD_DIR !== ""
      ? config.AVATAR_UPLOAD_DIR
      : "./uploads/avatars";

  return {
    APP_ENV: appEnv,
    APP_PORT: parseRequiredPositiveInt(config.APP_PORT, "APP_PORT"),
    DATABASE_URL: databaseUrl,
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: parseRequiredPositiveInt(config.JWT_EXPIRES_IN, "JWT_EXPIRES_IN"),
    JWT_REFRESH_EXPIRES_IN: parseRequiredPositiveInt(
      config.JWT_REFRESH_EXPIRES_IN,
      "JWT_REFRESH_EXPIRES_IN",
    ),
    CORS_ORIGIN: corsOrigin,
    COOKIE_SECURE: cookieSecure,
    UPLOAD_ROOT: uploadRoot,
    AVATAR_UPLOAD_DIR: avatarUploadDir,
    AVATAR_MAX_SIZE: parseRequiredPositiveInt(config.AVATAR_MAX_SIZE ?? 2097152, "AVATAR_MAX_SIZE"),
  };
};
