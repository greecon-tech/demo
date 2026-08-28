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
}

export interface LoginResult {
  token: string;
  user: {
    id: string;
    tenantId: string;
    email: string;
    name: string;
    role: UserRole;
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
      `SELECT u.id, u.tenant_id, u.email, u.name, u.password_hash, m.role
       FROM users u
       JOIN memberships m ON m.user_id = u.id AND m.tenant_id = u.tenant_id
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

    const role: UserRole = userRoles.includes(row.role as UserRole) ? (row.role as UserRole) : "viewer";
    const claims: JwtClaims = {
      sub: row.id,
      tenantId: row.tenant_id,
      role,
      email: row.email
    };

    const token = jwt.sign(claims, secret, { expiresIn: "12h" });

    return {
      token,
      user: {
        id: row.id,
        tenantId: row.tenant_id,
        email: row.email,
        name: row.name,
        role
      }
    };
  }
}
