import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { join } from "path";
import { AppModule } from "./app.module";

/**
 * 启动 NestJS 应用。
 * 功能：配置安全头、CORS、Cookie、静态资源、全局校验并监听端口。
 * 参数：无。
 * 返回值：Promise<void>。
 */
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  const corsOrigin = config.get<string>("CORS_ORIGIN");
  const cookieSecure = config.get<string>("COOKIE_SECURE") === "true";
  const uploadRoot = config.get<string>("UPLOAD_ROOT") ?? join(process.cwd(), "uploads");

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cookieParser());
  app.useStaticAssets(uploadRoot, { prefix: "/uploads/" });
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(config.get<string>("APP_PORT"));
  await app.listen(port);
  console.log(`GitGame API 已启动: http://localhost:${port} (secure cookie: ${cookieSecure})`);
}

bootstrap();
