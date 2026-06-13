import type { Response } from "express";

export type ApiErrorBody = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

/**
 * 返回统一成功响应。
 * 功能：包装 data 和 requestId。
 * 参数：res - Express 响应对象；data - 业务数据。
 * 返回值：无。
 */
export const sendSuccess = (res: Response, data: unknown) => {
  res.json({
    data,
    requestId: res.locals.requestId,
  });
};

/**
 * 返回统一失败响应。
 * 功能：包装 error 和 requestId。
 * 参数：res - 响应对象；status - HTTP 状态码；error - 错误信息。
 * 返回值：无。
 */
export const sendError = (res: Response, status: number, error: ApiErrorBody) => {
  res.status(status).json({
    error,
    requestId: res.locals.requestId,
  });
};

/**
 * 抛出带 HTTP 状态的业务错误。
 * 功能：让路由层统一捕获并转成 JSON 错误响应。
 * 参数：status - HTTP 状态码；code - 错误码；message - 用户可读说明。
 * 返回值：无，直接 throw。
 */
export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
