import "dotenv/config";
import cors from "cors";
import express from "express";
import { loadConfig } from "./config";
import { initDb } from "./db";
import { errorHandler } from "./middleware/errorHandler";
import { attachRequestId } from "./utils/requestId";
import { createAuthRouter } from "./routes/auth";
import { createHealthRouter } from "./routes/health";
import { createPlayerRouter } from "./routes/player";

/**
 * 启动 GitGame 后端 API 服务。
 * 功能：挂载认证、玩家、健康检查路由并监听端口。
 * 参数：无。
 * 返回值：无。
 */
const bootstrap = () => {
  const config = loadConfig();
  initDb(config);

  const app = express();
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(attachRequestId);

  app.use(createHealthRouter());
  app.use("/api/auth", createAuthRouter(config));
  app.use("/api/player", createPlayerRouter(config));

  app.use(errorHandler);

  app.listen(config.appPort, () => {
    console.log(`GitGame API 已启动: http://localhost:${config.appPort}`);
  });
};

bootstrap();
