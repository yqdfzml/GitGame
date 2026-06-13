import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";

/**
 * 启动 NestJS 应用。
 * 功能：配置安全头、CORS、Cookie、全局校验并监听端口。
 * 参数：无。
 * 返回值：Promise<void>。
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const corsOrigin = config.get<string>("CORS_ORIGIN");
  const cookieSecure = config.get<string>("COOKIE_SECURE") === "true";

  app.use(helmet());
  app.use(cookieParser());
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
