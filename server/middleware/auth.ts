import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { AppConfig } from "../config";
import { ApiError } from "../utils/response";

export type AuthUser = {
  id: number;
  email: string;
  displayName: string;
};

declare module "express-serve-static-core" {
  interface Locals {
    requestId: string;
    authUser?: AuthUser;
  }
}

type TokenPayload = {
  sub: string;
  email: string;
  displayName: string;
};

/**
 * 签发 JWT 访问令牌。
 * 功能：注册/登录成功后返回给前端。
 * 参数：config - 应用配置；user - 用户基本信息。
 * 返回值：accessToken 字符串。
 */
export const signAccessToken = (config: AppConfig, user: AuthUser) => {
  const payload: TokenPayload = {
    sub: String(user.id),
    email: user.email,
    displayName: user.displayName,
  };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
};

/**
 * 创建认证中间件。
 * 功能：解析 Authorization Bearer token 并写入 res.locals.authUser。
 * 参数：config - 应用配置。
 * 返回值：Express 中间件。
 */
export const createAuthMiddleware = (config: AppConfig) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.header("authorization");
    if (!header || !header.startsWith("Bearer ")) {
      next(new ApiError(401, "UNAUTHORIZED", "未登录或 token 无效"));
      return;
    }

    const token = header.slice("Bearer ".length).trim();
    try {
      const payload = jwt.verify(token, config.jwtSecret) as TokenPayload;
      res.locals.authUser = {
        id: Number(payload.sub),
        email: payload.email,
        displayName: payload.displayName,
      };
      next();
    } catch {
      next(new ApiError(401, "UNAUTHORIZED", "未登录或 token 无效"));
    }
  };
};
