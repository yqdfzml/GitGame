import "dotenv/config";

export type AppConfig = {
  appEnv: string;
  appPort: number;
  jwtSecret: string;
  jwtExpiresIn: number;
  corsOrigin: string;
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    poolMin: number;
    poolMax: number;
  };
};

/**
 * 收集缺失或未填写的必填环境变量名。
 * 功能：启动前一次性检查，避免用默认值掩盖配置问题。
 * 参数：keys - 必须非空的环境变量名列表。
 * 返回值：缺失项名称数组。
 */
const collectMissingEnvKeys = (keys: string[]) => {
  const missingKeys: string[] = [];

  for (const key of keys) {
    const value = process.env[key];
    if (value === undefined || value.trim() === "") {
      missingKeys.push(key);
    }
  }

  return missingKeys;
};

/**
 * 读取必填非空环境变量。
 * 功能：配置已通过 collectMissingEnvKeys 校验后安全读取。
 * 参数：key - 环境变量名。
 * 返回值：trim 后的字符串。
 */
const readRequiredEnv = (key: string) => {
  return process.env[key]!.trim();
};

/**
 * 读取必填正整数环境变量。
 * 功能：端口、连接池大小等数值配置强校验。
 * 参数：key - 环境变量名。
 * 返回值：正整数。
 */
const readRequiredPositiveInt = (key: string) => {
  const rawValue = readRequiredEnv(key);
  const parsed = Number(rawValue);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`环境变量 ${key} 必须是大于 0 的整数，当前值为「${rawValue}」`);
  }

  return parsed;
};

/** 后端启动必须显式配置的环境变量，不允许代码内默认值兜底 */
const REQUIRED_ENV_KEYS = [
  "APP_ENV",
  "APP_PORT",
  "DATABASE_HOST",
  "DATABASE_PORT",
  "DATABASE_NAME",
  "DATABASE_USER",
  "DATABASE_PASSWORD",
  "DATABASE_POOL_MIN",
  "DATABASE_POOL_MAX",
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
  "CORS_ORIGIN",
] as const;

/**
 * 读取后端运行所需的环境变量。
 * 功能：强约束校验，任一必填项缺失则立即抛错并终止启动。
 * 参数：无，直接从 process.env 读取。
 * 返回值：后端配置对象。
 */
export const loadConfig = (): AppConfig => {
  const missingKeys = collectMissingEnvKeys([...REQUIRED_ENV_KEYS]);

  if (missingKeys.length > 0) {
    throw new Error(
      [
        "后端配置不完整，以下环境变量必须在 .env 中显式设置：",
        missingKeys.map((key) => `  - ${key}`).join("\n"),
        "请参考 .env.example 在项目根目录创建 .env 后再启动。",
      ].join("\n"),
    );
  }

  const poolMin = readRequiredPositiveInt("DATABASE_POOL_MIN");
  const poolMax = readRequiredPositiveInt("DATABASE_POOL_MAX");

  if (poolMin > poolMax) {
    throw new Error("环境变量 DATABASE_POOL_MIN 不能大于 DATABASE_POOL_MAX");
  }

  return {
    appEnv: readRequiredEnv("APP_ENV"),
    appPort: readRequiredPositiveInt("APP_PORT"),
    jwtSecret: readRequiredEnv("JWT_SECRET"),
    jwtExpiresIn: readRequiredPositiveInt("JWT_EXPIRES_IN"),
    corsOrigin: readRequiredEnv("CORS_ORIGIN"),
    database: {
      host: readRequiredEnv("DATABASE_HOST"),
      port: readRequiredPositiveInt("DATABASE_PORT"),
      name: readRequiredEnv("DATABASE_NAME"),
      user: readRequiredEnv("DATABASE_USER"),
      password: readRequiredEnv("DATABASE_PASSWORD"),
      poolMin,
      poolMax,
    },
  };
};
