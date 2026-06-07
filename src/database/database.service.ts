import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Pool, QueryResult, QueryResultRow } from "pg";

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: Pool | undefined;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (connectionString) {
      this.pool = new Pool({ connectionString });
    }
  }

  async query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error("DATABASE_URL is not configured.");
    }

    return this.pool.query<T>(text, params);
  }

  async health(): Promise<"configured" | "connected" | "unconfigured" | "error"> {
    if (!this.pool) return "unconfigured";
    try {
      await this.pool.query("SELECT 1");
      return "connected";
    } catch (error) {
      this.logger.warn(`Database health check failed: ${error instanceof Error ? error.message : String(error)}`);
      return "error";
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
  }
}
