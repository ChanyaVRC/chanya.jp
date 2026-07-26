import { describe, expect, it, vi } from "vitest";

const joseMocks = vi.hoisted(() => {
  const keySet = vi.fn();
  return {
    keySet,
    createRemoteJWKSet: vi.fn(() => keySet),
    jwtVerify: vi.fn(async () => ({
      payload: { email: "admin@example.com" },
    })),
  };
});

vi.mock("jose", () => ({
  createRemoteJWKSet: joseMocks.createRemoteJWKSet,
  jwtVerify: joseMocks.jwtVerify,
}));

import { authenticateGalleryAdmin } from "../src/gallery/access";

describe("gallery Access authentication", () => {
  it("同じteam domainのJWKS resolverをrequest間で再利用する", async () => {
    const env = {
      GALLERY_BUCKET: {} as R2Bucket,
      IMAGES: {} as ImagesBinding,
      CF_ACCESS_TEAM_DOMAIN:
        "https://chanyakushima.cloudflareaccess.com" as const,
      CF_ACCESS_AUD:
        "08f4b21524ee5e79efaaa746e84959d1270a483459856b45c9aeb180e4c0941c" as const,
      GALLERY_ADMIN_EMAIL: "admin@example.com",
      GALLERY_ENVIRONMENT: "production" as const,
      GALLERY_CANONICAL_HOST: "chanya.jp" as const,
    };
    const request = new Request("https://chanya.jp/admin/gallery/", {
      headers: { "Cf-Access-Jwt-Assertion": "signed-token" },
    });

    await expect(
      authenticateGalleryAdmin(request, env),
    ).resolves.toMatchObject({ email: "admin@example.com" });
    await expect(
      authenticateGalleryAdmin(request, env),
    ).resolves.toMatchObject({ email: "admin@example.com" });

    expect(joseMocks.createRemoteJWKSet).toHaveBeenCalledTimes(1);
    expect(joseMocks.createRemoteJWKSet).toHaveBeenCalledWith(
      new URL(
        "https://chanyakushima.cloudflareaccess.com/cdn-cgi/access/certs",
      ),
    );
    expect(joseMocks.jwtVerify).toHaveBeenCalledTimes(2);
    expect(joseMocks.jwtVerify).toHaveBeenNthCalledWith(
      2,
      "signed-token",
      joseMocks.keySet,
      {
        audience:
          "08f4b21524ee5e79efaaa746e84959d1270a483459856b45c9aeb180e4c0941c",
        issuer: "https://chanyakushima.cloudflareaccess.com",
      },
    );
  });
});
