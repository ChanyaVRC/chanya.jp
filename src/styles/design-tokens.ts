export interface DesignToken<T extends string = string> {
  readonly $type:
    | "color"
    | "dimension"
    | "fontFamily"
    | "fontWeight"
    | "duration"
    | "cubicBezier"
    | "shadow";
  readonly $value: T;
}

const token = <T extends string>(
  $type: DesignToken<T>["$type"],
  $value: T,
): DesignToken<T> => ({ $type, $value });

export const designTokens = {
  color: {
    paper: token("color", "oklch(98.1% 0.008 255)"),
    paperRaised: token("color", "oklch(100% 0 0)"),
    paperQuiet: token("color", "oklch(95.5% 0.012 255)"),
    graphite: token("color", "oklch(24% 0.025 260)"),
    graphiteSoft: token("color", "oklch(45% 0.025 260)"),
    line: token("color", "oklch(86% 0.018 255)"),
    cobalt: token("color", "oklch(54% 0.22 263)"),
    cobaltDark: token("color", "oklch(42% 0.2 263)"),
    cobaltPale: token("color", "oklch(93.5% 0.04 263)"),
    accentInk: token("color", "oklch(97.5% 0.008 255)"),
    inverse: token("color", "oklch(97.5% 0.008 255)"),
    inverseSoft: token("color", "oklch(81% 0.02 255)"),
    danger: token("color", "oklch(54% 0.2 28)"),
    success: token("color", "oklch(50% 0.13 150)"),
    transparent: token("color", "transparent"),
  },
  font: {
    display: token(
      "fontFamily",
      '"Space Grotesk Variable", "Space Grotesk", sans-serif',
    ),
    body: token("fontFamily", '"Inter Variable", Inter, sans-serif'),
    mono: token(
      "fontFamily",
      '"JetBrains Mono Variable", "JetBrains Mono", monospace',
    ),
  },
  weight: {
    regular: token("fontWeight", "400"),
    medium: token("fontWeight", "550"),
    semibold: token("fontWeight", "650"),
    bold: token("fontWeight", "720"),
  },
  space: {
    0: token("dimension", "0"),
    1: token("dimension", "0.25rem"),
    2: token("dimension", "0.5rem"),
    3: token("dimension", "0.75rem"),
    4: token("dimension", "1rem"),
    5: token("dimension", "1.25rem"),
    6: token("dimension", "1.5rem"),
    8: token("dimension", "2rem"),
    10: token("dimension", "2.5rem"),
    12: token("dimension", "3rem"),
    16: token("dimension", "4rem"),
    20: token("dimension", "5rem"),
    24: token("dimension", "6rem"),
    32: token("dimension", "8rem"),
  },
  radius: {
    sharp: token("dimension", "0.125rem"),
    control: token("dimension", "0.375rem"),
    panel: token("dimension", "0.75rem"),
    round: token("dimension", "999px"),
  },
  size: {
    control: token("dimension", "2.75rem"),
    content: token("dimension", "76rem"),
    reading: token("dimension", "68ch"),
    hairline: token("dimension", "1px"),
    focusRing: token("dimension", "0.125rem"),
  },
  motion: {
    quick: token("duration", "120ms"),
    deliberate: token("duration", "280ms"),
    easeOut: token("cubicBezier", "cubic-bezier(0.22, 1, 0.36, 1)"),
  },
  shadow: {
    raised: token(
      "shadow",
      "0 1rem 3rem color-mix(in oklab, oklch(24% 0.025 260) 14%, transparent)",
    ),
  },
} as const;

type TokenValues<T> = {
  readonly [K in keyof T]: T[K] extends DesignToken<infer V>
    ? V
    : T[K] extends object
      ? TokenValues<T[K]>
      : never;
};

export function valuesOf<T extends object>(group: T): TokenValues<T> {
  return Object.fromEntries(
    Object.entries(group).map(([key, value]: [string, unknown]) => {
      if (typeof value !== "object" || value === null) {
        throw new TypeError(`Design token group "${key}" is invalid.`);
      }

      const record = value as Record<string, unknown>;
      return [
        key,
        "$value" in record
          ? record.$value
          : valuesOf(record),
      ];
    }),
  ) as TokenValues<T>;
}
