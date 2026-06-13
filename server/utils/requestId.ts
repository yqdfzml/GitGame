import type { NextFunction, Request, Response } from "express";

/**
 * 为每个请求生成 requestId，便于日志追踪。
 * 功能：写入 res.locals.requestId。
 * 参数：req/res/next - Express 标准中间件参数。
 * 返回值：无。
 */
export const attachRequestId = (req: Request, res: Response, next: NextFunction) => {
  // 优先使用上游传入的 requestId，否则本地生成
  const incomingId = req.header("x-request-id");
  const requestId = incomingId && incomingId.trim() ? incomingId.trim() : `req_${Date.now().toString(36)}`;
  res.locals.requestId = requestId;
  next();
};
