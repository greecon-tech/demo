import "reflect-metadata";
import helmet from "helmet";
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const logger = new Logger("Bootstrap");

  // A missing DATABASE_URL is legitimate (local dev without Postgres, the in-memory-only fallback
  // every domain in PlatformService has); a missing JWT_SECRET alongside a REAL database is not —
  // it means login can never work on what's clearly meant to be a real deployment. Warn loudly at
  // boot rather than letting that surface only when someone's first login attempt fails, so a
  // misconfigured production deploy is obvious in the deploy logs immediately.
  if (process.env.DATABASE_URL && !process.env.JWT_SECRET) {
    logger.warn(
      "DATABASE_URL is set but JWT_SECRET is not — this deployment has a real database but " +
        "login will fail for every user until JWT_SECRET is configured (docs/07-security-and-rbac.md)."
    );
  }

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  });

  app.use(helmet());
  app.enableCors({
    origin: [/^http:\/\/localhost:\d+$/],
    credentials: true
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Greecon Platform API")
    .setDescription("Operational API for Greecon sites, devices, telemetry, automation, alerts, and audit evidence.")
    .setVersion("0.1.0")
    .build();
  SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, swaggerConfig));

  // PORT is Railway's convention; API_PORT is ours (docker-compose, GCP). Railway's
  // private networking requires listening on "::" (IPv6), which also accepts ordinary
  // IPv4 connections on a dual-stack host — but not every host has IPv6 available at
  // all, so fall back to the plain default (0.0.0.0) rather than assuming.
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
  try {
    await app.listen(port, "::");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EAFNOSUPPORT") throw error;
    await app.listen(port);
  }
}

void bootstrap();
