import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { launch } from "chrome-launcher";
import lighthouse, { desktopConfig } from "lighthouse";

const threshold = 0.95;
const categoryIds = [
  "performance",
  "accessibility",
  "best-practices",
  "seo",
] as const;
const pages = [
  { name: "home", path: "/" },
  { name: "development", path: "/development/" },
  { name: "gallery", path: "/gallery/" },
  {
    name: "runtime-html",
    path: "/products/contents/RuntimeHtml/",
  },
] as const;

const baseUrl =
  process.env.LIGHTHOUSE_BASE_URL ?? "http://127.0.0.1:5173";
const reportDirectory = resolve("test-results", "lighthouse");
const profileDirectory = resolve(reportDirectory, "chrome-profile");

async function assertServerIsReady(): Promise<void> {
  const response = await fetch(baseUrl);
  if (!response.ok) {
    throw new Error(
      `Lighthouse target returned ${response.status}: ${baseUrl}`,
    );
  }
}

async function main(): Promise<void> {
  await assertServerIsReady();
  await mkdir(profileDirectory, { recursive: true });

  const chrome = await launch({
    chromePath: chromium.executablePath(),
    userDataDir: profileDirectory,
    chromeFlags: [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
    ],
    logLevel: "silent",
  });

  const failures: string[] = [];

  try {
    for (const page of pages) {
      const url = new URL(page.path, baseUrl).toString();
      const result = await lighthouse(
        url,
        {
          port: chrome.port,
          logLevel: "error",
          output: "json",
          onlyCategories: [...categoryIds],
        },
        desktopConfig,
      );

      if (!result) {
        throw new Error(`Lighthouse returned no result for ${url}`);
      }

      await writeFile(
        resolve(reportDirectory, `${page.name}.json`),
        JSON.stringify(result.lhr, null, 2),
        "utf8",
      );

      const summary = categoryIds.map((categoryId) => {
        const score = result.lhr.categories[categoryId]?.score ?? 0;
        if (score < threshold) {
          failures.push(
            `${page.name} ${categoryId}: ${Math.round(score * 100)}`,
          );
        }
        return `${categoryId} ${Math.round(score * 100)}`;
      });

      console.log(`${page.name}: ${summary.join(" · ")}`);
    }
  } finally {
    chrome.kill();
  }

  if (failures.length > 0) {
    throw new Error(
      `Lighthouse threshold ${threshold * 100} was not met:\n${failures.join("\n")}`,
    );
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
