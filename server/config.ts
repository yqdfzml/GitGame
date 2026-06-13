/**
 * 读取后端运行所需的环境变量。
 * 功能：集中管理端口、数据库、JWT 和 CORS 配置。
 * 参数：无，直接从 process.env 读取。
 * 返回值：后端配置对象。
 */
export const loadConfig = () => {
  // 当前运行环境，默认 development
  const appEnv = process.env.APP_ENV ?? "development";
  // HTTP 监听端口
  const appPort = Number(process.env.APP_PORT ?? 3000);
  // JWT 签名密钥
  const jwtSecret = process.env.JWT_SECRET ?? "gitgame-dev-secret-change-me";
  // JWT 过期秒数
  const jwtExpiresIn = Number(process.env.JWT_EXPIRES_IN ?? 3600);
  // 允许跨域的前端地址
  const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";

  return {
    appEnv,
    appPort,
    jwtSecret,
    jwtExpiresIn,
    corsOrigin,
    database: {
      host: process.env.DATABASE_HOST ?? "localhost",
      port: Number(process.env.DATABASE_PORT ?? 3306),
      name: process.env.DATABASE_NAME ?? "git_game",
      user: process.env.DATABASE_USER ?? "git_game_app",
      password: process.env.DATABASE_PASSWORD ?? "",
      poolMin: Number(process.env.DATABASE_POOL_MIN ?? 2),
      poolMax: Number(process.env.DATABASE_POOL_MAX ?? 10),
    },
  };
};

export type AppConfig = ReturnType<typeof loadConfig>;
