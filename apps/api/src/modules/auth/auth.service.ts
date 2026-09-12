import { Injectable, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserRole, userRoles } from "@greecon/shared";
import { DatabaseService } from "../../database/database.service";
import { JwtClaims, jwtSecret } from "../../common/principal";

interface UserCredentialRow {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  password_hash: string | null;
  role: string;
  is_platform_admin: boolean;
  tenant_status: string;
}

export interface LoginResult {
  token: string;
  user: {
    id: string;
    tenantId: string;
    email: string;
    name: string;
    role: UserRole;
    isPlatformAdmin: boolean;
  };
}

@Injectable()
export class AuthService {
  constructor(private readonly db: DatabaseService) {}

  async login(email: string, password: string): Promise<LoginResult> {
    // Real login needs a real, persisted user + password hash to check — there's no in-memory
    // fallback here the way most other domains have one, because the whole point is that a
    // header can no longer just assert an identity (see docs/07-security-and-rbac.md).
    if (!this.db.isConfigured()) {
      throw new UnauthorizedException("This deployment has no database configured — there is nothing to log in against.");
    }

    const secret = jwtSecret();
    if (!secret) {
      throw new UnauthorizedException("JWT_SECRET is not configured on this deployment.");
    }

    const result = await this.db.query<UserCredentialRow>(
      `SELECT u.id, u.tenant_id, u.email, u.name, u.password_hash, u.is_platform_admin, m.role, t.status AS tenant_status
       FROM users u
       JOIN memberships m ON m.user_id = u.id AND m.tenant_id = u.tenant_id
       JOIN tenants t ON t.id = u.tenant_id
       WHERE lower(u.email) = lower($1) AND u.status = 'active'
       LIMIT 1`,
      [email]
    );

    const row = result.rows[0];
    // Compare against a dummy hash even on a missing user so a login attempt against a
    // nonexistent email takes about as long as one against a real email with a wrong password —
    // a cheap, standard defense against using response time to enumerate valid accounts.
    const hash = row?.password_hash ?? "$2b$10$invalidsaltinvalidsaltinvalidsaltinvalidsal";
    const valid = await bcrypt.compare(password, hash);

    if (!row || !row.password_hash || !valid) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const isPlatformAdmin = row.is_platform_admin === true;
    // A suspended client's users must not even get a fresh token — TenantStatusGuard (see
    // apps/api/src/common/tenant-status.guard.ts) also rejects an already-issued one on every
    // subsequent request, but rejecting here too means the failure is immediate and obvious
    // rather than "logs in fine, then every page fails." Platform admins are exempt: their own
    // account lives in Greecon's own tenant, which suspension never targets.
    if (!isPlatformAdmin && row.tenant_status !== "active") {
      throw new UnauthorizedException("This account's client has been suspended. Contact Greecon support.");
    }

    const role: UserRole = userRoles.includes(row.role as UserRole) ? (row.role as UserRole) : "viewer";
    const claims: JwtClaims = {
      sub: row.id,
      tenantId: row.tenant_id,
      role,
      email: row.email,
      isPlatformAdmin
    };

    const token = jwt.sign(claims, secret, { expiresIn: "12h" });

    return {
      token,
      user: {
        id: row.id,
        tenantId: row.tenant_id,
        email: row.email,
        name: row.name,
        role,
        isPlatformAdmin
      }
    };
  }
}
