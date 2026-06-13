import mysql from "mysql2/promise";
import type { AppConfig } from "./config";

// 全局数据库连接池，整个服务复用
let pool: mysql.Pool | null = null;

/**
 * 初始化 MySQL 连接池。
 * 功能：根据配置创建可复用的连接池。
 * 参数：config - 应用配置对象。
 * 返回值：无。
 */
export const initDb = (config: AppConfig) => {
  pool = mysql.createPool({
    host: config.database.host,
    port: config.database.port,
    database: config.database.name,
    user: config.database.user,
    password: config.database.password,
    waitForConnections: true,
    connectionLimit: config.database.poolMax,
    charset: "utf8mb4",
  });
};

/**
 * 获取数据库连接池。
 * 功能：供业务层执行 SQL。
 * 参数：无。
 * 返回值：MySQL 连接池实例。
 */
export const getPool = () => {
  if (!pool) {
    throw new Error("数据库连接池尚未初始化");
  }
  return pool;
};

/**
 * 检查数据库是否可用。
 * 功能：供 /readyz 健康检查使用。
 * 参数：无。
 * 返回值：true 表示可连接，false 表示不可用。
 */
export const pingDatabase = async () => {
  try {
    const db = getPool();
    await db.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
};

/**
 * 在事务中执行业务逻辑。
 * 功能：保证注册、通关结算等写操作的原子性。
 * 参数：handler - 接收 connection 的业务函数。
 * 返回值：handler 的返回结果。
 */
export const withTransaction = async <T>(handler: (connection: mysql.PoolConnection) => Promise<T>) => {
  const db = getPool();
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const result = await handler(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
