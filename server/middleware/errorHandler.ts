import type { NextFunction, Request, Response } from "express";
import { ApiError, sendError } from "../utils/response";

/**
 * 统一错误处理中间件。
 * 功能：把 ApiError 和普通异常转成规范 JSON 响应。
 * 参数：err/req/res/next - Express 错误中间件参数。
 * 返回值：无。
 */
export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    sendError(res, err.status, {
      code: err.code,
      message: err.message,
      details: err.details,
    });
    return;
  }

  console.error("[server]", err);
  sendError(res, 500, {
    code: "INTERNAL_ERROR",
    message: "服务内部错误",
  });
};

/**
 * 异步路由包装器。
 * 功能：让 async 路由错误自动进入 errorHandler。
 * 参数：handler - 异步路由函数。
 * 返回值：Express 中间件。
 */
export const asyncHandler =
  (handler: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
