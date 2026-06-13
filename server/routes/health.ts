import { Router } from "express";
import { pingDatabase } from "../db";
import { sendSuccess } from "../utils/response";

/**
 * 创建健康检查路由。
 * 功能：/healthz 与 /readyz。
 * 参数：无。
 * 返回值：Express Router。
 */
export const createHealthRouter = () => {
  const router = Router();

  router.get("/healthz", (_req, res) => {
    sendSuccess(res, { ok: true });
  });

  router.get("/readyz", async (_req, res) => {
    const ready = await pingDatabase();
    if (!ready) {
      res.status(503).json({
        error: { code: "SERVICE_UNAVAILABLE", message: "数据库不可用" },
        requestId: res.locals.requestId,
      });
      return;
    }
    sendSuccess(res, { ok: true });
  });

  return router;
};
