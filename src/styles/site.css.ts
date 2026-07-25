/* Hallmark · genre: modern-minimal · macrostructure: Split Studio · theme: Cobalt · enrichment: existing profile photography · nav: N1b · footer: Ft2 · contrast: pass (40–41) · slop: pass (42–45) · honest: pass (46) · chrome: pass (47) · tokens: pass (48) · responsive: pass (49) · icons: pass (30) · mobile: pass (34, 49, 50–57) */
/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import { createGlobalTheme, globalStyle, style } from "@vanilla-extract/css";
import { designTokens, valuesOf } from "./design-tokens";

export const vars = createGlobalTheme(":root", valuesOf(designTokens));

const focusRing = {
  outline: `${vars.size.focusRing} solid ${vars.color.cobalt}`,
  outlineOffset: vars.size.hairline,
} as const;

const controlReset = {
  minHeight: vars.size.control,
  border: `${vars.size.hairline} solid ${vars.color.line}`,
  borderRadius: vars.radius.control,
  font: "inherit",
  cursor: "pointer",
  transition: `transform ${vars.motion.quick} ${vars.motion.easeOut}, border-color ${vars.motion.quick} ${vars.motion.easeOut}, background-color ${vars.motion.quick} ${vars.motion.easeOut}, color ${vars.motion.quick} ${vars.motion.easeOut}`,
} as const;

const sectionPad = {
  paddingInline: `max(${vars.space[4]}, env(safe-area-inset-left))`,
  "@media": {
    "screen and (min-width: 48rem)": {
      paddingInline: vars.space[8],
    },
  },
} as const;

globalStyle("*", {
  boxSizing: "border-box",
});

globalStyle("html", {
  minWidth: "20rem",
  overflowX: "clip",
  scrollBehavior: "smooth",
  background: vars.color.paper,
  color: vars.color.graphite,
  fontFamily: vars.font.body,
  fontSize: "100%",
  fontSynthesis: "none",
  textRendering: "optimizeLegibility",
});

globalStyle("body", {
  minWidth: "20rem",
  minHeight: "100vh",
  margin: 0,
  overflowX: "clip",
  background: vars.color.paper,
  color: vars.color.graphite,
  lineHeight: 1.65,
});

globalStyle("body:has(dialog[open])", {
  overflow: "hidden",
});

globalStyle("::selection", {
  background: vars.color.cobaltPale,
  color: vars.color.graphite,
});

globalStyle("h1, h2, h3, p, figure, pre, ul, dl, dd", {
  marginBlock: 0,
});

globalStyle("h1, h2, h3", {
  minWidth: 0,
  fontFamily: vars.font.display,
  fontWeight: vars.weight.semibold,
  lineHeight: 1.02,
  letterSpacing: "-0.035em",
  overflowWrap: "anywhere",
  textWrap: "balance",
});

globalStyle("h1", {
  fontSize: "clamp(2rem, 5vw, 3.25rem)",
});

globalStyle("h2", {
  fontSize: "clamp(2rem, 5vw, 4.25rem)",
});

globalStyle("h3", {
  fontSize: "clamp(1.25rem, 3vw, 1.75rem)",
});

globalStyle("a", {
  color: "inherit",
  textDecoration: "none",
});

globalStyle("button, input, textarea", {
  font: "inherit",
});

globalStyle("a, button, input, textarea", {
  outline: `${vars.size.focusRing} solid ${vars.color.transparent}`,
  outlineOffset: vars.size.hairline,
});

globalStyle("button", {
  color: "inherit",
  whiteSpace: "nowrap",
});

globalStyle("img, picture, svg, iframe", {
  display: "block",
  maxWidth: "100%",
});

globalStyle("img", {
  height: "auto",
});

globalStyle("pre, code, kbd", {
  fontFamily: vars.font.mono,
});

globalStyle("kbd", {
  fontSize: "0.72em",
  fontWeight: vars.weight.medium,
});

globalStyle(":focus-visible", focusRing);

globalStyle("a:active, button:active", {
  transform: `translateY(${vars.size.hairline})`,
});

globalStyle(
  "button:disabled, input:disabled, textarea:disabled, [aria-disabled='true']",
  {
    cursor: "not-allowed",
    opacity: 0.55,
  },
);

globalStyle("[aria-disabled='true']", {
  pointerEvents: "none",
});

globalStyle("[hidden]", {
  display: "none !important",
});

globalStyle(".js [data-reveal]", {
  opacity: 0,
  transform: `translateY(${vars.space[3]})`,
  transition: `opacity ${vars.motion.deliberate} ${vars.motion.easeOut}, transform ${vars.motion.deliberate} ${vars.motion.easeOut}`,
});

globalStyle(".js [data-reveal][data-revealed='true']", {
  opacity: 1,
  transform: "none",
});

globalStyle("[data-state='loading']", {
  cursor: "wait",
  opacity: 0.72,
});

globalStyle("[data-state='error']", {
  borderColor: `${vars.color.danger} !important`,
});

globalStyle("[data-state='success']", {
  borderColor: `${vars.color.success} !important`,
});

export const srOnly = style({
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
});

export const skipLink = style({
  position: "fixed",
  zIndex: 100,
  insetBlockStart: vars.space[2],
  insetInlineStart: vars.space[2],
  padding: `${vars.space[2]} ${vars.space[4]}`,
  background: vars.color.graphite,
  color: vars.color.inverse,
  transform: "translateY(-160%)",
  transition: `transform ${vars.motion.quick} ${vars.motion.easeOut}`,
  selectors: {
    "&:focus": {
      transform: "translateY(0)",
    },
  },
});

export const header = style({
  position: "sticky",
  zIndex: 40,
  insetBlockStart: 0,
  borderBottom: `${vars.size.hairline} solid ${vars.color.transparent}`,
  background: vars.color.paper,
  transition: `border-color ${vars.motion.quick} ${vars.motion.easeOut}`,
  selectors: {
    "&[data-scrolled='true']": {
      borderBottomColor: vars.color.line,
    },
  },
});

export const navInner = style({
  ...sectionPad,
  display: "flex",
  alignItems: "center",
  width: "100%",
  maxWidth: vars.size.content,
  minHeight: "4.5rem",
  marginInline: "auto",
  gap: vars.space[4],
});

export const wordmark = style({
  display: "inline-flex",
  alignItems: "baseline",
  minHeight: vars.size.control,
  fontFamily: vars.font.display,
  fontSize: "1.2rem",
  fontWeight: vars.weight.bold,
  letterSpacing: "-0.04em",
});

export const wordmarkSuffix = style({
  color: vars.color.cobalt,
});

export const desktopNav = style({
  display: "none",
  alignItems: "center",
  gap: vars.space[6],
  marginInlineStart: "auto",
  "@media": {
    "screen and (min-width: 60rem)": {
      display: "flex",
    },
  },
});

export const navLink = style({
  position: "relative",
  display: "grid",
  minHeight: vars.size.control,
  placeItems: "center",
  fontSize: "0.83rem",
  fontWeight: vars.weight.medium,
  selectors: {
    "&::after": {
      position: "absolute",
      insetInline: 0,
      insetBlockEnd: vars.space[2],
      height: vars.size.hairline,
      background: vars.color.cobalt,
      content: '""',
      transform: "scaleX(0)",
      transformOrigin: "left",
      transition: `transform ${vars.motion.quick} ${vars.motion.easeOut}`,
    },
    "&[aria-current='page']::after": {
      transform: "scaleX(1)",
    },
  },
  "@media": {
    "(hover: hover)": {
      selectors: {
        "&:hover::after": {
          transform: "scaleX(1)",
        },
      },
    },
  },
});

export const navActions = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space[2],
  marginInlineStart: "auto",
  "@media": {
    "screen and (min-width: 60rem)": {
      marginInlineStart: vars.space[4],
    },
  },
});

export const searchButton = style({
  ...controlReset,
  display: "none",
  alignItems: "center",
  gap: vars.space[4],
  paddingInline: vars.space[3],
  background: vars.color.transparent,
  selectors: {
    "&:active": {
      transform: "translateY(1px)",
    },
    "&:disabled": {
      cursor: "not-allowed",
      opacity: 0.5,
    },
  },
  "@media": {
    "screen and (min-width: 48rem)": {
      display: "flex",
    },
    "(hover: hover)": {
      selectors: {
        "&:hover": {
          borderColor: vars.color.graphiteSoft,
        },
      },
    },
  },
});

globalStyle(`${searchButton} kbd`, {
  padding: `${vars.space[1]} ${vars.space[2]}`,
  border: `${vars.size.hairline} solid ${vars.color.line}`,
  borderRadius: vars.radius.sharp,
  background: vars.color.paperQuiet,
});

export const primaryButton = style({
  ...controlReset,
  display: "none",
  placeItems: "center",
  paddingInline: vars.space[4],
  borderColor: vars.color.cobalt,
  background: vars.color.cobalt,
  color: vars.color.accentInk,
  fontWeight: vars.weight.semibold,
  selectors: {
    "&:active": {
      transform: "translateY(1px)",
    },
    "&[aria-current='page']": {
      background: vars.color.cobaltDark,
    },
  },
  "@media": {
    "screen and (min-width: 31rem)": {
      display: "grid",
    },
    "(hover: hover)": {
      selectors: {
        "&:hover": {
          borderColor: vars.color.cobaltDark,
          background: vars.color.cobaltDark,
        },
      },
    },
  },
});

export const menuButton = style({
  ...controlReset,
  display: "grid",
  placeItems: "center",
  minWidth: vars.size.control,
  paddingInline: vars.space[3],
  background: vars.color.paperRaised,
  selectors: {
    "&:active": {
      transform: "translateY(1px)",
    },
  },
  "@media": {
    "screen and (min-width: 60rem)": {
      display: "none",
    },
    "(hover: hover)": {
      selectors: {
        "&:hover": {
          borderColor: vars.color.graphiteSoft,
        },
      },
    },
  },
});

export const mobileNav = style({
  ...sectionPad,
  display: "grid",
  maxWidth: vars.size.content,
  marginInline: "auto",
  paddingBlock: `${vars.space[2]} ${vars.space[5]}`,
  borderTop: `${vars.size.hairline} solid ${vars.color.line}`,
  background: vars.color.paper,
  "@media": {
    "screen and (min-width: 60rem)": {
      display: "none !important",
    },
  },
});

export const mobileNavLink = style({
  display: "flex",
  alignItems: "center",
  minHeight: vars.size.control,
  borderBottom: `${vars.size.hairline} solid ${vars.color.line}`,
  fontFamily: vars.font.display,
  fontWeight: vars.weight.medium,
  selectors: {
    "&[aria-current='page']": {
      color: vars.color.cobalt,
    },
  },
});

export const mobileSearchButton = style({
  ...controlReset,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBlockStart: vars.space[3],
  paddingInline: vars.space[3],
  background: vars.color.paperRaised,
});

export const main = style({
  width: "100%",
});

export const footer = style({
  ...sectionPad,
  borderTop: `${vars.size.hairline} solid ${vars.color.line}`,
});

export const footerInner = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  maxWidth: vars.size.content,
  minHeight: "6rem",
  marginInline: "auto",
  gap: `${vars.space[2]} ${vars.space[6]}`,
  color: vars.color.graphiteSoft,
  fontSize: "0.78rem",
});

globalStyle(`${footerInner} a`, {
  minHeight: vars.size.control,
  display: "inline-flex",
  alignItems: "center",
  color: vars.color.graphite,
  textDecoration: "underline",
  textDecorationColor: vars.color.line,
  textUnderlineOffset: vars.space[1],
});

export const commandDialog = style({
  width: `min(calc(100% - ${vars.space[4]}), 38rem)`,
  maxHeight: "min(40rem, calc(100dvh - 2rem))",
  marginBlockStart: vars.space[8],
  padding: 0,
  overflow: "hidden",
  border: `${vars.size.hairline} solid ${vars.color.graphite}`,
  borderRadius: vars.radius.panel,
  background: vars.color.paperRaised,
  color: vars.color.graphite,
  boxShadow: vars.shadow.raised,
});

globalStyle(`${commandDialog}::backdrop`, {
  background: `color-mix(in oklab, ${vars.color.graphite} 62%, ${vars.color.transparent})`,
});

export const commandHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  minHeight: "3.5rem",
  paddingInline: vars.space[4],
  borderBottom: `${vars.size.hairline} solid ${vars.color.line}`,
  fontFamily: vars.font.display,
  fontWeight: vars.weight.semibold,
});

export const dialogClose = style({
  minWidth: vars.size.control,
  minHeight: vars.size.control,
  border: 0,
  background: vars.color.transparent,
  cursor: "pointer",
  fontSize: "0.78rem",
});

export const commandInput = style({
  width: `calc(100% - ${vars.space[8]})`,
  minHeight: "3.25rem",
  margin: vars.space[4],
  paddingInline: vars.space[3],
  border: `${vars.size.hairline} solid ${vars.color.line}`,
  borderRadius: vars.radius.control,
  background: vars.color.paper,
  color: vars.color.graphite,
  selectors: {
    "&::placeholder": {
      color: vars.color.graphiteSoft,
    },
  },
});

export const commandList = style({
  maxHeight: "23rem",
  margin: 0,
  padding: `0 ${vars.space[2]}`,
  overflowY: "auto",
  listStyle: "none",
});

export const commandItem = style({
  borderRadius: vars.radius.control,
  selectors: {
    "&[aria-selected='true']": {
      background: vars.color.cobaltPale,
    },
  },
});

globalStyle(`${commandItem} a`, {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  minHeight: "3.5rem",
  paddingInline: vars.space[3],
  gap: vars.space[4],
});

globalStyle(`${commandItem} small`, {
  color: vars.color.graphiteSoft,
  fontSize: "0.75rem",
  textAlign: "right",
});

export const commandHint = style({
  padding: vars.space[3],
  borderTop: `${vars.size.hairline} solid ${vars.color.line}`,
  color: vars.color.graphiteSoft,
  fontSize: "0.72rem",
  textAlign: "center",
});

export const meta = style({
  color: vars.color.cobaltDark,
  fontFamily: vars.font.body,
  fontSize: "0.72rem",
  fontWeight: vars.weight.medium,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
});

export const heroSplit = style({
  ...sectionPad,
  display: "grid",
  width: "100%",
  maxWidth: vars.size.content,
  minHeight: "calc(100svh - 4.5rem)",
  marginInline: "auto",
  paddingBlockStart: vars.space[12],
  paddingBlockEnd: vars.space[20],
  gap: vars.space[12],
  alignItems: "center",
  "@media": {
    "screen and (min-width: 48rem)": {
      gridTemplateColumns: "minmax(0, 1.05fr) minmax(20rem, 0.95fr)",
      paddingBlockStart: vars.space[16],
      paddingBlockEnd: vars.space[24],
    },
  },
});

export const heroCopy = style({
  display: "grid",
  alignContent: "center",
  gap: vars.space[6],
});

globalStyle(`${heroCopy} h1`, {
  maxWidth: "10ch",
  fontSize: "clamp(2.75rem, 10vw, 7rem)",
});

export const heroLede = style({
  maxWidth: "60ch",
  color: vars.color.graphiteSoft,
  fontSize: "clamp(1rem, 2vw, 1.25rem)",
});

export const actionRow = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: vars.space[3],
});

export const primaryButtonLarge = style({
  ...controlReset,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "3.25rem",
  paddingInline: vars.space[6],
  borderColor: vars.color.cobalt,
  background: vars.color.cobalt,
  color: vars.color.accentInk,
  fontWeight: vars.weight.semibold,
  selectors: {
    "&:active": {
      transform: "translateY(1px)",
    },
  },
  "@media": {
    "(hover: hover)": {
      selectors: {
        "&:hover": {
          borderColor: vars.color.cobaltDark,
          background: vars.color.cobaltDark,
        },
      },
    },
  },
});

export const secondaryButton = style({
  ...controlReset,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "3.25rem",
  paddingInline: vars.space[6],
  background: vars.color.paperRaised,
  fontWeight: vars.weight.medium,
  selectors: {
    "&:active": {
      transform: "translateY(1px)",
    },
  },
  "@media": {
    "(hover: hover)": {
      selectors: {
        "&:hover": {
          borderColor: vars.color.graphiteSoft,
        },
      },
    },
  },
});

export const heroProof = style({
  position: "relative",
  display: "grid",
  gridTemplateColumns: "minmax(0, 5fr) minmax(0, 2fr)",
  alignItems: "end",
  minWidth: 0,
  paddingInlineEnd: vars.space[3],
  "@media": {
    "screen and (max-width: 23.5rem)": {
      gridTemplateColumns: "minmax(0, 1fr)",
      paddingInlineEnd: 0,
    },
  },
});

export const profileFigure = style({
  minWidth: 0,
});

globalStyle(`${profileFigure} picture`, {
  aspectRatio: "1",
  overflow: "hidden",
  background: vars.color.paperQuiet,
});

globalStyle(`${profileFigure} img`, {
  width: "100%",
  height: "100%",
  objectFit: "cover",
});

globalStyle(`${profileFigure} figcaption`, {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "space-between",
  gap: vars.space[2],
  paddingBlockStart: vars.space[2],
  fontSize: "0.75rem",
});

globalStyle(`${profileFigure} figcaption span`, {
  color: vars.color.graphiteSoft,
});

export const codeFigure = style({
  position: "relative",
  zIndex: 1,
  width: "clamp(12rem, 38vw, 22rem)",
  minWidth: 0,
  maxWidth: "100%",
  marginInlineStart: "-90%",
  marginBlockEnd: vars.space[5],
  padding: vars.space[4],
  border: `${vars.size.hairline} solid ${vars.color.graphite}`,
  background: vars.color.paperRaised,
  boxShadow: vars.shadow.raised,
  "@media": {
    "screen and (max-width: 23.5rem)": {
      width: `calc(100% - ${vars.space[8]})`,
      marginBlockStart: `calc(0px - ${vars.space[16]})`,
      marginInlineStart: vars.space[8],
    },
  },
});

globalStyle(`${codeFigure} figcaption`, {
  marginBlockEnd: vars.space[3],
  color: vars.color.graphiteSoft,
  fontFamily: vars.font.mono,
  fontSize: "0.66rem",
});

globalStyle(`${codeFigure} pre`, {
  overflowX: "auto",
  fontSize: "clamp(0.58rem, 1.6vw, 0.78rem)",
  lineHeight: 1.7,
});

globalStyle(`${codeFigure} [data-type-line]`, {
  color: vars.color.cobaltDark,
  fontWeight: vars.weight.bold,
});

export const darkBand = style({
  ...sectionPad,
  display: "grid",
  gap: vars.space[12],
  paddingBlock: vars.space[16],
  background: vars.color.graphite,
  color: vars.color.inverse,
  "@media": {
    "screen and (min-width: 48rem)": {
      gridTemplateColumns: "minmax(0, 1.4fr) minmax(15rem, 0.6fr)",
      alignItems: "end",
      paddingBlock: vars.space[20],
    },
  },
});

globalStyle(`${darkBand} > *`, {
  width: "100%",
  maxWidth: vars.size.reading,
});

globalStyle(`${darkBand} > div`, {
  justifySelf: "end",
});

globalStyle(`${darkBand} h2`, {
  marginBlockEnd: vars.space[5],
});

globalStyle(`${darkBand} p`, {
  color: vars.color.inverseSoft,
});

globalStyle(`${darkBand} nav`, {
  display: "grid",
});

globalStyle(`${darkBand} nav a`, {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  minHeight: "3.75rem",
  borderBottom: `${vars.size.hairline} solid ${vars.color.graphiteSoft}`,
  fontFamily: vars.font.display,
  fontWeight: vars.weight.medium,
});

globalStyle(`${darkBand} nav a span`, {
  color: vars.color.cobaltPale,
});

export const splitSection = style({
  ...sectionPad,
  display: "grid",
  width: "100%",
  maxWidth: vars.size.content,
  marginInline: "auto",
  paddingBlock: vars.space[16],
  gap: vars.space[10],
  alignItems: "center",
  "@media": {
    "screen and (min-width: 48rem)": {
      gridTemplateColumns: "minmax(0, 0.8fr) minmax(0, 1.2fr)",
      paddingBlock: vars.space[24],
    },
  },
});

export const splitSectionReverse = style({
  "@media": {
    "screen and (min-width: 48rem)": {
      gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 0.8fr)",
    },
  },
});

export const splitCopy = style({
  display: "grid",
  gap: vars.space[5],
  alignContent: "center",
});

globalStyle(`${splitCopy} p`, {
  maxWidth: "65ch",
  color: vars.color.graphiteSoft,
});

export const textLink = style({
  display: "inline-flex",
  width: "fit-content",
  minHeight: vars.size.control,
  alignItems: "center",
  gap: vars.space[2],
  borderBottom: `${vars.size.hairline} solid ${vars.color.graphite}`,
  fontWeight: vars.weight.semibold,
  selectors: {
    "&:active": {
      transform: "translateY(1px)",
    },
  },
  "@media": {
    "(hover: hover)": {
      selectors: {
        "&:hover": {
          borderBottomColor: vars.color.cobalt,
          color: vars.color.cobaltDark,
        },
      },
    },
  },
});

export const plainCode = style({
  minWidth: 0,
  padding: vars.space[6],
  border: `${vars.size.hairline} solid ${vars.color.line}`,
  borderBlockStartColor: vars.color.cobalt,
  background: vars.color.paperQuiet,
});

globalStyle(`${plainCode} figcaption`, {
  marginBlockEnd: vars.space[3],
  color: vars.color.graphiteSoft,
  fontFamily: vars.font.mono,
  fontSize: "0.66rem",
});

globalStyle(`${plainCode} pre`, {
  overflowX: "auto",
  fontSize: "clamp(0.7rem, 2vw, 0.9rem)",
  lineHeight: 1.8,
});

export const featureImage = style({
  minWidth: 0,
  overflow: "hidden",
  background: vars.color.paperQuiet,
});

globalStyle(`${featureImage} picture, ${featureImage} img`, {
  width: "100%",
});

globalStyle(`${featureImage} img`, {
  aspectRatio: "16 / 9",
  objectFit: "cover",
});

export const pageIntro = style({
  ...sectionPad,
  display: "grid",
  width: "100%",
  maxWidth: vars.size.content,
  marginInline: "auto",
  paddingBlock: vars.space[16],
  gap: vars.space[8],
  borderBottom: `${vars.size.hairline} solid ${vars.color.line}`,
  "@media": {
    "screen and (min-width: 48rem)": {
      gridTemplateColumns: "minmax(0, 1.25fr) minmax(17rem, 0.75fr)",
      alignItems: "end",
      paddingBlock: vars.space[24],
    },
  },
});

globalStyle(`${pageIntro} > div`, {
  display: "grid",
  gap: vars.space[4],
});

globalStyle(`${pageIntro} > p`, {
  maxWidth: "60ch",
  color: vars.color.graphiteSoft,
  fontSize: "1.05rem",
});

export const aboutSplit = style({
  ...sectionPad,
  display: "grid",
  width: "100%",
  maxWidth: vars.size.content,
  marginInline: "auto",
  paddingBlock: vars.space[12],
  gap: vars.space[10],
  "@media": {
    "screen and (min-width: 48rem)": {
      gridTemplateColumns: "minmax(16rem, 0.8fr) minmax(0, 1.2fr)",
      paddingBlock: vars.space[20],
    },
  },
});

export const aboutPortrait = style({
  width: "min(100%, 30rem)",
  background: vars.color.paperQuiet,
});

globalStyle(`${aboutPortrait} img`, {
  width: "100%",
  aspectRatio: "1",
  objectFit: "cover",
});

export const profileDetails = style({
  display: "grid",
  alignContent: "start",
  gap: vars.space[8],
});

globalStyle(`${profileDetails} dl`, {
  display: "grid",
  borderTop: `${vars.size.hairline} solid ${vars.color.graphite}`,
});

globalStyle(`${profileDetails} dl div`, {
  display: "grid",
  gridTemplateColumns: "minmax(7rem, 0.35fr) minmax(0, 0.65fr)",
  gap: vars.space[4],
  paddingBlock: vars.space[4],
  borderBottom: `${vars.size.hairline} solid ${vars.color.line}`,
});

globalStyle(`${profileDetails} dt`, {
  color: vars.color.graphiteSoft,
  fontFamily: vars.font.body,
  fontSize: "0.72rem",
});

globalStyle(`${profileDetails} dd`, {
  fontFamily: vars.font.display,
  fontWeight: vars.weight.medium,
});

globalStyle(`${profileDetails} > p`, {
  maxWidth: vars.size.reading,
  color: vars.color.graphiteSoft,
});

export const projectGrid = style({
  ...sectionPad,
  display: "grid",
  width: "100%",
  maxWidth: vars.size.content,
  marginInline: "auto",
  paddingBlock: vars.space[12],
  gap: vars.space[4],
  "@media": {
    "screen and (min-width: 48rem)": {
      gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
      paddingBlock: vars.space[20],
    },
  },
});

export const projectCard = style({
  display: "grid",
  minWidth: 0,
  padding: vars.space[6],
  gap: vars.space[5],
  border: `${vars.size.hairline} solid ${vars.color.line}`,
  background: vars.color.paperRaised,
  "@media": {
    "screen and (min-width: 48rem)": {
      gridColumn: "span 5",
      selectors: {
        "&:nth-child(3)": {
          gridColumn: "6 / span 7",
        },
      },
    },
  },
});

globalStyle(`${projectCard} > p:not(${meta})`, {
  color: vars.color.graphiteSoft,
});

export const projectCardFeatured = style({
  "@media": {
    "screen and (min-width: 48rem)": {
      gridColumn: "span 7",
      gridRow: "span 2",
      padding: vars.space[10],
    },
  },
});

export const tagList = style({
  display: "flex",
  flexWrap: "wrap",
  margin: 0,
  padding: 0,
  gap: vars.space[2],
  listStyle: "none",
});

globalStyle(`${tagList} li`, {
  padding: `${vars.space[1]} ${vars.space[2]}`,
  border: `${vars.size.hairline} solid ${vars.color.line}`,
  borderRadius: vars.radius.round,
  color: vars.color.graphiteSoft,
  fontFamily: vars.font.body,
  fontSize: "0.66rem",
});

export const codeBand = style({
  ...sectionPad,
  display: "grid",
  gap: vars.space[10],
  paddingBlock: vars.space[16],
  background: vars.color.graphite,
  color: vars.color.inverse,
  "@media": {
    "screen and (min-width: 48rem)": {
      gridTemplateColumns: "minmax(0, 0.85fr) minmax(0, 1.15fr)",
      paddingBlock: vars.space[20],
    },
  },
});

globalStyle(`${codeBand} > *`, {
  width: "100%",
  maxWidth: "45rem",
});

globalStyle(`${codeBand} > div`, {
  justifySelf: "end",
});

globalStyle(`${codeBand} h2`, {
  marginBlock: `${vars.space[3]} ${vars.space[5]}`,
});

globalStyle(`${codeBand} > div > p:last-child`, {
  color: vars.color.inverseSoft,
});

globalStyle(`${codeBand} pre`, {
  minWidth: 0,
  paddingInlineStart: vars.space[4],
  overflowX: "auto",
  borderInlineStart: `${vars.size.hairline} solid ${vars.color.graphiteSoft}`,
  color: vars.color.cobaltPale,
  fontSize: "clamp(0.68rem, 2vw, 0.9rem)",
  lineHeight: 1.8,
});

export const metaOnDark = style({
  color: vars.color.cobaltPale,
  fontFamily: vars.font.body,
  fontSize: "0.72rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
});

export const galleryGrid = style({
  ...sectionPad,
  display: "grid",
  width: "100%",
  maxWidth: vars.size.content,
  marginInline: "auto",
  paddingBlock: vars.space[8],
  gap: vars.space[6],
  "@media": {
    "screen and (min-width: 40rem)": {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    },
    "screen and (min-width: 60rem)": {
      gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
      paddingBlock: vars.space[12],
    },
  },
});

export const galleryItem = style({
  minWidth: 0,
  "@media": {
    "screen and (min-width: 60rem)": {
      gridColumn: "span 4",
      selectors: {
        "&:nth-child(9n + 1), &:nth-child(9n + 6)": {
          gridColumn: "span 8",
        },
        "&:nth-child(9n + 4)": {
          gridColumn: "3 / span 5",
        },
        "&:nth-child(9n + 5)": {
          gridColumn: "8 / span 5",
        },
      },
    },
  },
});

globalStyle(`${galleryItem} figcaption`, {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: vars.space[3],
  paddingBlockStart: vars.space[2],
  fontSize: "0.72rem",
});

globalStyle(`${galleryItem} time`, {
  color: vars.color.graphiteSoft,
  fontFamily: vars.font.body,
});

export const galleryButton = style({
  display: "block",
  width: "100%",
  minHeight: vars.size.control,
  padding: 0,
  overflow: "hidden",
  border: `${vars.size.hairline} solid ${vars.color.line}`,
  borderRadius: 0,
  background: vars.color.paperQuiet,
  cursor: "zoom-in",
  selectors: {
    "&:active": {
      transform: "scale(0.997)",
    },
    "&:disabled": {
      cursor: "not-allowed",
      opacity: 0.5,
    },
  },
});

globalStyle(`${galleryButton} picture, ${galleryButton} img`, {
  width: "100%",
});

globalStyle(`${galleryButton} img`, {
  aspectRatio: "16 / 9",
  objectFit: "cover",
  transition: `transform ${vars.motion.deliberate} ${vars.motion.easeOut}`,
});

globalStyle(`${galleryButton}:hover img`, {
  transform: "scale(1.015)",
});

export const lightboxDialog = style({
  width: `min(calc(100% - ${vars.space[4]}), 76rem)`,
  maxHeight: "calc(100dvh - 2rem)",
  padding: 0,
  overflow: "auto",
  border: `${vars.size.hairline} solid ${vars.color.graphite}`,
  borderRadius: vars.radius.sharp,
  background: vars.color.graphite,
  color: vars.color.inverse,
});

globalStyle(`${lightboxDialog}::backdrop`, {
  background: `color-mix(in oklab, ${vars.color.graphite} 84%, ${vars.color.transparent})`,
});

globalStyle(`${lightboxDialog} > img`, {
  width: "100%",
  maxHeight: "calc(100dvh - 6rem)",
  objectFit: "contain",
  background: vars.color.graphite,
});

export const lightboxTopbar = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  minHeight: "4rem",
  paddingInline: vars.space[4],
  gap: vars.space[4],
});

globalStyle(`${lightboxTopbar} > div`, {
  display: "flex",
  alignItems: "baseline",
  gap: vars.space[3],
});

globalStyle(`${lightboxTopbar} span`, {
  color: vars.color.inverseSoft,
  fontFamily: vars.font.body,
  fontSize: "0.7rem",
});

globalStyle(`${lightboxTopbar} button`, {
  minWidth: vars.size.control,
  minHeight: vars.size.control,
  border: `${vars.size.hairline} solid ${vars.color.graphiteSoft}`,
  borderRadius: vars.radius.control,
  background: vars.color.transparent,
  color: vars.color.inverse,
  cursor: "pointer",
});

export const contactIndex = style({
  ...sectionPad,
  display: "grid",
  width: "100%",
  maxWidth: vars.size.content,
  marginInline: "auto",
  paddingBlock: vars.space[8],
});

globalStyle(`${contactIndex} > a`, {
  display: "grid",
  gridTemplateColumns: "minmax(4rem, 0.25fr) minmax(0, 1fr) auto",
  alignItems: "center",
  minHeight: "6rem",
  gap: vars.space[4],
  borderBottom: `${vars.size.hairline} solid ${vars.color.line}`,
});

globalStyle(`${contactIndex} > a:first-child`, {
  borderTop: `${vars.size.hairline} solid ${vars.color.graphite}`,
});

globalStyle(`${contactIndex} > a > span:first-child`, {
  color: vars.color.graphiteSoft,
  fontFamily: vars.font.body,
  fontSize: "0.7rem",
});

globalStyle(`${contactIndex} strong`, {
  overflowWrap: "anywhere",
  fontFamily: vars.font.display,
  fontSize: "clamp(1.1rem, 4vw, 2.75rem)",
});

export const linkSection = style({
  ...sectionPad,
  width: "100%",
  maxWidth: vars.size.content,
  marginInline: "auto",
  paddingBlock: vars.space[12],
});

globalStyle(`${linkSection} h2`, {
  marginBlockEnd: vars.space[8],
});

export const linkIndex = style({
  margin: 0,
  padding: 0,
  borderTop: `${vars.size.hairline} solid ${vars.color.graphite}`,
  listStyle: "none",
});

globalStyle(`${linkIndex} li`, {
  borderBottom: `${vars.size.hairline} solid ${vars.color.line}`,
});

globalStyle(`${linkIndex} a`, {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  minHeight: "5.25rem",
  paddingBlock: vars.space[3],
  gap: vars.space[5],
});

globalStyle(`${linkIndex} a > span:first-child`, {
  display: "grid",
  gap: vars.space[1],
});

globalStyle(`${linkIndex} strong`, {
  fontFamily: vars.font.display,
  fontSize: "1.15rem",
});

globalStyle(`${linkIndex} small`, {
  color: vars.color.graphiteSoft,
});

export const toolIntro = pageIntro;

export const runtimeGrid = style({
  ...sectionPad,
  display: "grid",
  width: "100%",
  maxWidth: vars.size.content,
  minHeight: "42rem",
  marginInline: "auto",
  paddingBlock: vars.space[6],
  gap: vars.space[4],
  "@media": {
    "screen and (min-width: 60rem)": {
      gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
      paddingBlock: vars.space[8],
    },
  },
});

export const editorPane = style({
  display: "grid",
  minWidth: 0,
  minHeight: "32rem",
  gridTemplateRows: "auto minmax(20rem, 1fr) auto",
  border: `${vars.size.hairline} solid ${vars.color.line}`,
  background: vars.color.paperRaised,
});

export const toolBar = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  minHeight: "4rem",
  padding: vars.space[2],
  gap: vars.space[2],
  borderBottom: `${vars.size.hairline} solid ${vars.color.line}`,
});

globalStyle(`${toolBar} label`, {
  paddingInline: vars.space[2],
  fontFamily: vars.font.mono,
  fontSize: "0.72rem",
});

globalStyle(`${toolBar} > div`, {
  display: "flex",
  gap: vars.space[2],
});

globalStyle(`${toolBar} button`, {
  minHeight: vars.size.control,
  paddingInline: vars.space[4],
  border: `${vars.size.hairline} solid ${vars.color.line}`,
  borderRadius: vars.radius.control,
  background: vars.color.paper,
  cursor: "pointer",
});

globalStyle(`${toolBar} button:last-child`, {
  borderColor: vars.color.cobalt,
  background: vars.color.cobalt,
  color: vars.color.accentInk,
});

export const runtimeTextarea = style({
  width: "100%",
  minHeight: "20rem",
  padding: vars.space[4],
  resize: "vertical",
  border: 0,
  borderRadius: 0,
  background: vars.color.paperRaised,
  color: vars.color.graphite,
  fontFamily: vars.font.mono,
  fontSize: "0.78rem",
  lineHeight: 1.7,
  tabSize: 2,
  selectors: {
    "&:focus-visible": {
      outline: `${vars.size.focusRing} solid ${vars.color.cobalt}`,
      outlineOffset: `calc(${vars.size.focusRing} * -1)`,
    },
  },
});

export const toolStatus = style({
  minHeight: vars.size.control,
  padding: `${vars.space[3]} ${vars.space[4]}`,
  borderTop: `${vars.size.hairline} solid ${vars.color.line}`,
  color: vars.color.graphiteSoft,
  fontSize: "0.72rem",
});

export const previewPane = style({
  display: "grid",
  minWidth: 0,
  minHeight: "32rem",
  gridTemplateRows: "4rem minmax(0, 1fr)",
  border: `${vars.size.hairline} solid ${vars.color.line}`,
  background: vars.color.paperRaised,
});

globalStyle(`${previewPane} > p`, {
  display: "flex",
  alignItems: "center",
  paddingInline: vars.space[4],
  borderBottom: `${vars.size.hairline} solid ${vars.color.line}`,
  color: vars.color.graphiteSoft,
  fontFamily: vars.font.body,
  fontSize: "0.72rem",
});

globalStyle(`${previewPane} iframe`, {
  width: "100%",
  height: "100%",
  minHeight: "28rem",
  border: 0,
  background: vars.color.paperRaised,
});

export const securityNote = style({
  ...sectionPad,
  display: "grid",
  width: "100%",
  maxWidth: vars.size.content,
  marginInline: "auto",
  paddingBlock: `${vars.space[8]} ${vars.space[16]}`,
  gap: vars.space[4],
});

globalStyle(`${securityNote} h2`, {
  fontSize: "1.5rem",
});

globalStyle(`${securityNote} p`, {
  maxWidth: vars.size.reading,
  color: vars.color.graphiteSoft,
});

export const notFound = style({
  ...sectionPad,
  display: "grid",
  placeContent: "center start",
  minHeight: "calc(100svh - 10.5rem)",
  gap: vars.space[6],
});

globalStyle(`${notFound} p`, {
  maxWidth: vars.size.reading,
  color: vars.color.graphiteSoft,
});

globalStyle("html", {
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      scrollBehavior: "auto",
    },
  },
});

globalStyle(".js [data-reveal]", {
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      opacity: 1,
      transform: "none",
      transition: "none",
    },
  },
});

globalStyle(
  `${navLink}, ${primaryButton}, ${mobileNavLink}, ${textLink}, ${primaryButtonLarge}, ${secondaryButton}, ${footerInner} a, ${darkBand} nav a`,
  {
    whiteSpace: "nowrap",
  },
);

globalStyle("*, *::before, *::after", {
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      animationDuration: "0.01ms !important",
      animationIterationCount: "1 !important",
      scrollBehavior: "auto",
      transitionDelay: "0ms !important",
      transitionDuration: "0.01ms !important",
    },
  },
});
