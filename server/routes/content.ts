import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { getCachedBootstrap, refreshContentCache } from "../game/contentCache";
import { loadContentBootstrap } from "../services/contentService";
import { sendSuccess } from "../utils/response";

/**
 * 创建公开内容路由。
 * 功能：向前端提供关卡、称号、等级等全部游戏内容。
 * 参数：无。
 * 返回值：Express Router。
 */
export const createContentRouter = () => {
  const router = Router();

  router.get(
    "/bootstrap",
    asyncHandler(async (_req, res) => {
      const cached = getCachedBootstrap();
      if (cached) {
        sendSuccess(res, cached);
        return;
      }
      const bootstrap = await loadContentBootstrap();
      sendSuccess(res, bootstrap);
    }),
  );

  router.get(
    "/challenges",
    asyncHandler(async (_req, res) => {
      const cached = getCachedBootstrap();
      const challenges = cached ? cached.challenges : (await loadContentBootstrap()).challenges;
      sendSuccess(res, { challenges, total: challenges.length });
    }),
  );

  router.post(
    "/refresh-cache",
    asyncHandler(async (_req, res) => {
      await refreshContentCache();
      sendSuccess(res, { ok: true });
    }),
  );

  return router;
};
