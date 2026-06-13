import { Router } from "express";
import type { AppConfig } from "../config";
import { createAuthMiddleware } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { submitChallengeAttempt } from "../services/attemptService";
import {
  getPlayerChallengeProgress,
  getPlayerProfile,
  getPlayerTitles,
  updateCurrentTitle,
} from "../services/playerService";
import { sendSuccess } from "../utils/response";
import { ApiError } from "../utils/response";

/**
 * 创建玩家相关路由。
 * 功能：档案、称号、关卡进度、通关提交。
 * 参数：config - 应用配置。
 * 返回值：Express Router。
 */
export const createPlayerRouter = (config: AppConfig) => {
  const router = Router();
  const requireAuth = createAuthMiddleware(config);

  router.use(requireAuth);

  router.get(
    "/profile",
    asyncHandler(async (_req, res) => {
      const profile = await getPlayerProfile(res.locals.authUser!.id);
      sendSuccess(res, profile);
    }),
  );

  router.get(
    "/titles",
    asyncHandler(async (_req, res) => {
      const titles = await getPlayerTitles(res.locals.authUser!.id);
      sendSuccess(res, titles);
    }),
  );

  router.patch(
    "/current-title",
    asyncHandler(async (req, res) => {
      const titleKey = String(req.body.titleKey ?? "").trim();
      if (!titleKey) {
        throw new ApiError(400, "VALIDATION_ERROR", "titleKey 不能为空");
      }
      const currentTitle = await updateCurrentTitle(res.locals.authUser!.id, titleKey);
      sendSuccess(res, { currentTitle });
    }),
  );

  router.get(
    "/challenge-progress",
    asyncHandler(async (_req, res) => {
      const progress = await getPlayerChallengeProgress(res.locals.authUser!.id);
      sendSuccess(res, progress);
    }),
  );

  router.post(
    "/challenge-attempts",
    asyncHandler(async (req, res) => {
      const result = await submitChallengeAttempt({
        userId: res.locals.authUser!.id,
        challengeKey: String(req.body.challengeKey ?? ""),
        challengeVersion: Number(req.body.challengeVersion ?? 1),
        score: Number(req.body.score ?? 0),
        mistakeCount: Number(req.body.mistakeCount ?? 0),
        hintCount: Number(req.body.hintCount ?? 0),
        inOrder: Boolean(req.body.inOrder),
        commandCount: Number(req.body.commandCount ?? 0),
        durationSeconds: req.body.durationSeconds === undefined ? undefined : Number(req.body.durationSeconds),
        commandLog: Array.isArray(req.body.commandLog) ? req.body.commandLog.map(String) : [],
      });
      sendSuccess(res, result);
    }),
  );

  return router;
};
