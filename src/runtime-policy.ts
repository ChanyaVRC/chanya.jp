export const runtimeInitialSource = `<style>
  body {
    margin: 0;
    min-height: 100vh;
    display: grid;
    place-items: center;
    background: #f4f7ff;
    color: #1d2433;
    font: 16px/1.6 system-ui, sans-serif;
  }
  button {
    min-height: 44px;
    padding: 0 18px;
    border: 1px solid #315ee8;
    border-radius: 6px;
    background: #315ee8;
    color: white;
  }
</style>

<main>
  <h1>Hello, RuntimeHtml.</h1>
  <button type="button" id="hello">Run JavaScript</button>
  <p id="result" aria-live="polite"></p>
</main>

<script>
  document.querySelector("#hello")?.addEventListener("click", () => {
    const result = document.querySelector("#result");
    if (result) result.textContent = "JavaScript is running inside the sandbox.";
  });
</script>`;

const runtimeCsp = [
  "default-src 'none'",
  "img-src data: blob:",
  "style-src 'unsafe-inline'",
  "script-src 'unsafe-inline'",
  "font-src data:",
  "connect-src 'none'",
  "media-src data: blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

const runtimeGuard = `<script>
  (() => {
    const blocked = () => {
      throw new EvalError("Dynamic code evaluation is disabled in RuntimeHtml.");
    };
    Object.defineProperty(globalThis, "eval", {
      value: blocked,
      writable: false,
      configurable: false
    });
    Object.defineProperty(globalThis, "Function", {
      value: blocked,
      writable: false,
      configurable: false
    });
  })();
</script>`;

export function buildRuntimeDocument(source: string): string {
  const guard = [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<meta http-equiv="Content-Security-Policy" content="${runtimeCsp}">`,
    "<title>RuntimeHtml preview</title>",
    "</head>",
    `<body>${runtimeGuard}${source}</body>`,
    "</html>",
  ];

  return guard.join("");
}
