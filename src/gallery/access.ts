import { createRemoteJWKSet, jwtVerify } from "jose";

const accessKeySets = new Map<
  string,
  ReturnType<typeof createRemoteJWKSet>
>();

export interface GalleryAdminIdentity {
  readonly email: string;
  readonly localDevelopment: boolean;
}

export class GalleryAccessError extends Error {
  readonly status: 401 | 403 | 503;

  constructor(
    status: 401 | 403 | 503,
    message: string,
  ) {
    super(message);
    this.name = "GalleryAccessError";
    this.status = status;
  }
}

function isLocalDevelopmentRequest(request: Request): boolean {
  if (!import.meta.env.DEV) {
    return false;
  }

  const hostname = new URL(request.url).hostname;
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  );
}

function accessConfiguration(env: CloudflareBindings | undefined): {
  readonly teamDomain: string;
  readonly audience: string;
  readonly adminEmail: string;
} {
  const teamDomain =
    env?.CF_ACCESS_TEAM_DOMAIN?.replace(/\/+$/u, "") ?? "";
  const audience = env?.CF_ACCESS_AUD?.trim() ?? "";
  const adminEmail =
    env?.GALLERY_ADMIN_EMAIL?.trim().toLocaleLowerCase("en") ?? "";

  if (
    teamDomain.includes("replace-me") ||
    teamDomain === "" ||
    audience === "replace-me" ||
    audience === "" ||
    adminEmail === "" ||
    adminEmail.startsWith("replace-me@")
  ) {
    throw new GalleryAccessError(
      503,
      "Gallery administration is not configured.",
    );
  }

  const teamUrl = new URL(teamDomain);
  if (
    teamUrl.protocol !== "https:" ||
    !teamUrl.hostname.endsWith(".cloudflareaccess.com")
  ) {
    throw new GalleryAccessError(
      503,
      "Cloudflare Access team domain is invalid.",
    );
  }

  return { teamDomain, audience, adminEmail };
}

function accessKeySet(
  teamDomain: string,
): ReturnType<typeof createRemoteJWKSet> {
  const existing = accessKeySets.get(teamDomain);
  if (existing) {
    return existing;
  }

  const keySet = createRemoteJWKSet(
    new URL(`${teamDomain}/cdn-cgi/access/certs`),
  );
  accessKeySets.set(teamDomain, keySet);
  return keySet;
}

export async function authenticateGalleryAdmin(
  request: Request,
  env: CloudflareBindings | undefined,
): Promise<GalleryAdminIdentity> {
  if (isLocalDevelopmentRequest(request)) {
    return {
      email: "local-development@chanya.jp",
      localDevelopment: true,
    };
  }

  const config = accessConfiguration(env);
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) {
    throw new GalleryAccessError(401, "Cloudflare Access token is missing.");
  }

  try {
    const keySet = accessKeySet(config.teamDomain);
    const verification = await jwtVerify(token, keySet, {
      audience: config.audience,
      issuer: config.teamDomain,
    });
    const email =
      typeof verification.payload.email === "string"
        ? verification.payload.email.toLocaleLowerCase("en")
        : "";

    if (email !== config.adminEmail) {
      throw new GalleryAccessError(403, "This account is not an administrator.");
    }

    return { email, localDevelopment: false };
  } catch (error) {
    if (error instanceof GalleryAccessError) {
      throw error;
    }

    throw new GalleryAccessError(401, "Cloudflare Access token is invalid.");
  }
}

function cookieValue(request: Request, name: string): string | null {
  const cookies = request.headers.get("Cookie")?.split(";") ?? [];
  for (const cookie of cookies) {
    const separator = cookie.indexOf("=");
    if (separator < 0) {
      continue;
    }

    if (cookie.slice(0, separator).trim() === name) {
      try {
        return decodeURIComponent(cookie.slice(separator + 1).trim());
      } catch {
        return null;
      }
    }
  }

  return null;
}

export function createGalleryCsrfToken(request?: Request): string {
  const existing = request
    ? cookieValue(request, "gallery_csrf")
    : null;
  return existing &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      existing,
    )
    ? existing
    : crypto.randomUUID();
}

export function galleryCsrfCookie(token: string, secure = true): string {
  return [
    `gallery_csrf=${encodeURIComponent(token)}`,
    "Path=/admin/gallery/",
    ...(secure ? ["Secure"] : []),
    "SameSite=Strict",
    "Max-Age=14400",
  ].join("; ");
}

export function assertGalleryMutationRequest(request: Request): void {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (origin !== requestUrl.origin) {
    throw new GalleryAccessError(403, "Request origin is not allowed.");
  }

  if (request.headers.get("X-Gallery-Admin") !== "1") {
    throw new GalleryAccessError(403, "Admin request marker is missing.");
  }

  const cookieToken = cookieValue(request, "gallery_csrf");
  const headerToken = request.headers.get("X-Gallery-CSRF");
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw new GalleryAccessError(403, "CSRF token is invalid.");
  }

  const contentType = request.headers.get("Content-Type") ?? "";
  if (
    !contentType.startsWith("application/json") &&
    !contentType.startsWith("multipart/form-data")
  ) {
    throw new GalleryAccessError(403, "Request content type is not allowed.");
  }
}
