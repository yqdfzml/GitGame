import { Router } from "express";
import type { AppConfig } from "../config";
import { createAuthMiddleware, signAccessToken } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { getUserById, loginUser, registerUser } from "../services/authService";
import { sendSuccess } from "../utils/response";

/**
 * 创建认证相关路由。
 * 功能：注册、登录、登出、读取当前用户。
 * 参数：config - 应用配置。
 * 返回值：Express Router。
 */
export const createAuthRouter = (config: AppConfig) => {
  const router = Router();
  const requireAuth = createAuthMiddleware(config);

  router.post(
    "/register",
    asyncHandler(async (req, res) => {
      const user = await registerUser({
        email: String(req.body.email ?? ""),
        password: String(req.body.password ?? ""),
        displayName: String(req.body.displayName ?? ""),
      });
      const accessToken = signAccessToken(config, {
        id: Number(user.id),
        email: user.email,
        displayName: user.displayName,
      });
      sendSuccess(res, { accessToken, user });
    }),
  );

  router.post(
    "/login",
    asyncHandler(async (req, res) => {
      const user = await loginUser({
        email: String(req.body.email ?? ""),
        password: String(req.body.password ?? ""),
      });
      const accessToken = signAccessToken(config, {
        id: Number(user.id),
        email: user.email,
        displayName: user.displayName,
      });
      sendSuccess(res, { accessToken, user });
    }),
  );

  router.post("/logout", requireAuth, (_req, res) => {
    sendSuccess(res, { ok: true });
  });

  router.get(
    "/me",
    requireAuth,
    asyncHandler(async (_req, res) => {
      const authUser = res.locals.authUser!;
      const user = await getUserById(authUser.id);
      sendSuccess(res, { user });
    }),
  );

  return router;
};
