/* Hallmark · genre: modern-minimal · macrostructure: Multi-page system (Split Studio / Long Document / Index-First / Catalogue / Workbench / Component Playground) · home variation: identity copy / uncropped icon · theme: Cobalt · enrichment: owned profile and gallery photography · nav: N1b · footer: Ft2 · contrast: pass (40–41) · slop: pass (42–45) · honest: pass (46) · chrome: pass (47) · tokens: pass (48) · responsive: pass (49) · icons: pass (30) · mobile: pass (34, 49, 50–57) */
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
  margin: 0,
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
  borderColor: vars.color.cobaltDark,
  background: vars.color.cobaltDark,
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
          borderColor: vars.color.graphite,
          background: vars.color.graphite,
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
  gridTemplateAreas: '"copy" "profile"',
  gridTemplateColumns: "minmax(0, 1fr)",
  width: "100%",
  maxWidth: vars.size.content,
  marginInline: "auto",
  paddingBlockStart: vars.space[12],
  paddingBlockEnd: vars.space[16],
  rowGap: vars.space[8],
  alignItems: "start",
  "@media": {
    "screen and (min-width: 60rem)": {
      gridTemplateAreas: '"copy profile"',
      gridTemplateColumns: "minmax(0, 7fr) minmax(20rem, 5fr)",
      minHeight: "calc(100svh - 4.5rem)",
      paddingInline: vars.space[8],
      paddingBlockStart: vars.space[16],
      paddingBlockEnd: vars.space[24],
      columnGap: vars.space[12],
      alignContent: "center",
      alignItems: "center",
    },
  },
});

export const heroCopy = style({
  gridArea: "copy",
  display: "grid",
  alignContent: "center",
  gap: vars.space[6],
});

globalStyle(`${heroCopy} h1`, {
  maxWidth: "10ch",
  fontSize: "clamp(2.75rem, 7vw, 5.5rem)",
});

globalStyle(`${heroCopy} h1 span`, {
  display: "block",
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

export const profileFigure = style({
  gridArea: "profile",
  minWidth: 0,
  "@media": {
    "screen and (min-width: 60rem)": {
      width: "min(100%, 25rem)",
      justifySelf: "end",
      alignSelf: "center",
    },
  },
});

globalStyle(`${profileFigure} picture`, {
  position: "relative",
  aspectRatio: "1",
  overflow: "hidden",
  background: vars.color.paperQuiet,
});

globalStyle(`${profileFigure} img`, {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "contain",
  objectPosition: "center",
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
  color: vars.color.cobaltDark,
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

export const compactHeading = style({
  display: "grid",
  minWidth: 0,
  gap: vars.space[3],
});

export const aboutProfile = style({
  ...sectionPad,
  display: "grid",
  width: "100%",
  maxWidth: vars.size.content,
  marginInline: "auto",
  paddingBlock: `${vars.space[10]} ${vars.space[16]}`,
  gridTemplateColumns: "minmax(0, 1fr)",
  gridTemplateAreas: '"lead" "portrait" "details"',
  gap: vars.space[10],
  "@media": {
    "screen and (min-width: 48rem)": {
      gridTemplateColumns: "minmax(18rem, 0.86fr) minmax(0, 1.14fr)",
      gridTemplateAreas: '"portrait lead" "portrait details"',
      alignItems: "start",
      paddingBlock: `${vars.space[12]} ${vars.space[20]}`,
      columnGap: vars.space[12],
      rowGap: vars.space[8],
    },
  },
});

export const aboutPortrait = style({
  display: "grid",
  width: "100%",
  maxWidth: "30rem",
  minWidth: 0,
  gridArea: "portrait",
  alignSelf: "start",
  gap: vars.space[3],
  background: vars.color.paperQuiet,
});

globalStyle(`${aboutPortrait} picture, ${aboutPortrait} img`, {
  width: "100%",
});

globalStyle(`${aboutPortrait} img`, {
  aspectRatio: "1",
  objectFit: "cover",
});

globalStyle(`${aboutPortrait} figcaption`, {
  paddingInline: vars.space[1],
  color: vars.color.graphiteSoft,
  fontFamily: vars.font.body,
  fontSize: "0.7rem",
});

export const aboutLead = style({
  display: "grid",
  minWidth: 0,
  gridArea: "lead",
  alignContent: "start",
  gap: vars.space[6],
});

globalStyle(`${aboutLead} > div`, {
  display: "grid",
  gap: vars.space[3],
});

export const aboutStatement = style({
  maxWidth: "46ch",
  color: vars.color.graphiteSoft,
  fontSize: "clamp(1.05rem, 2vw, 1.3rem)",
});

export const profileDetails = style({
  display: "grid",
  minWidth: 0,
  gridArea: "details",
  alignContent: "start",
  gap: vars.space[6],
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

export const developmentMasthead = style({
  ...sectionPad,
  display: "grid",
  width: "100%",
  maxWidth: vars.size.content,
  marginInline: "auto",
  paddingBlock: `${vars.space[10]} ${vars.space[12]}`,
  gap: vars.space[6],
  borderBottom: `${vars.size.hairline} solid ${vars.color.line}`,
  "@media": {
    "screen and (min-width: 48rem)": {
      gridTemplateColumns:
        "minmax(0, 4.5fr) minmax(17rem, 4.5fr) minmax(8rem, 1.5fr)",
      alignItems: "end",
      paddingBlock: `${vars.space[12]} ${vars.space[16]}`,
      gap: vars.space[8],
    },
  },
});

export const developmentLede = style({
  maxWidth: "54ch",
  color: vars.color.graphiteSoft,
});

export const projectCount = style({
  display: "flex",
  alignItems: "baseline",
  gap: vars.space[3],
  color: vars.color.graphiteSoft,
  "@media": {
    "screen and (min-width: 48rem)": {
      display: "grid",
      justifySelf: "end",
      gap: 0,
    },
  },
});

globalStyle(`${projectCount} strong`, {
  color: vars.color.graphite,
  fontFamily: vars.font.display,
  fontSize: "2rem",
  fontWeight: vars.weight.medium,
  fontVariantNumeric: "tabular-nums",
  lineHeight: 1,
});

globalStyle(`${projectCount} span`, {
  fontFamily: vars.font.body,
  fontSize: "0.7rem",
  whiteSpace: "nowrap",
});

export const projectIndex = style({
  ...sectionPad,
  display: "grid",
  width: "100%",
  maxWidth: vars.size.content,
  marginInline: "auto",
  paddingBlock: `${vars.space[6]} ${vars.space[16]}`,
});

export const projectRecord = style({
  display: "grid",
  minWidth: 0,
  paddingBlock: vars.space[6],
  gap: vars.space[5],
  borderBottom: `${vars.size.hairline} solid ${vars.color.line}`,
  selectors: {
    "&:first-child": {
      borderTop: `${vars.size.hairline} solid ${vars.color.graphite}`,
    },
  },
  "@media": {
    "screen and (min-width: 60rem)": {
      gridTemplateColumns:
        "minmax(11rem, 3fr) minmax(18rem, 5fr) minmax(14rem, 4fr)",
      alignItems: "start",
      paddingBlock: vars.space[8],
      gap: vars.space[8],
    },
  },
});

export const projectIdentity = style({
  display: "grid",
  minWidth: 0,
  gap: vars.space[2],
});

globalStyle(`${projectIdentity} h2`, {
  fontSize: "clamp(1.65rem, 3vw, 2.4rem)",
});

export const projectDescription = style({
  maxWidth: "60ch",
  color: vars.color.graphiteSoft,
});

export const projectDestination = style({
  display: "grid",
  minWidth: 0,
  alignContent: "space-between",
  justifyItems: "start",
  gap: vars.space[5],
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
  display: "inline-flex",
  alignItems: "center",
  gap: vars.space[2],
  color: vars.color.graphiteSoft,
  fontFamily: vars.font.body,
  fontSize: "0.66rem",
});

globalStyle(`${tagList} li:not(:last-child)::after`, {
  color: vars.color.line,
  content: '"/"',
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

export const galleryMasthead = style({
  ...sectionPad,
  display: "grid",
  width: "100%",
  maxWidth: vars.size.content,
  marginInline: "auto",
  paddingBlock: `${vars.space[10]} ${vars.space[8]}`,
  gap: vars.space[6],
  borderBottom: `${vars.size.hairline} solid ${vars.color.line}`,
  "@media": {
    "screen and (min-width: 48rem)": {
      gridTemplateColumns:
        "minmax(0, 5fr) minmax(17rem, 4fr) minmax(10rem, 3fr)",
      alignItems: "end",
      paddingBlock: `${vars.space[12]} ${vars.space[10]}`,
      gap: vars.space[8],
    },
  },
});

export const galleryLede = style({
  maxWidth: "54ch",
  color: vars.color.graphiteSoft,
});

export const galleryFacts = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  minWidth: 0,
  borderTop: `${vars.size.hairline} solid ${vars.color.graphite}`,
});

globalStyle(`${galleryFacts} > div`, {
  display: "grid",
  paddingBlock: vars.space[3],
  gap: vars.space[1],
  borderBottom: `${vars.size.hairline} solid ${vars.color.line}`,
});

globalStyle(`${galleryFacts} dt`, {
  color: vars.color.graphiteSoft,
  fontFamily: vars.font.body,
  fontSize: "0.66rem",
});

globalStyle(`${galleryFacts} dd`, {
  fontFamily: vars.font.display,
  fontSize: "1rem",
  fontVariantNumeric: "tabular-nums",
});

export const gallerySections = style({
  ...sectionPad,
  display: "grid",
  width: "100%",
  maxWidth: vars.size.content,
  marginInline: "auto",
  paddingBlock: `${vars.space[4]} ${vars.space[16]}`,
  gap: vars.space[16],
});

export const gallerySection = style({
  position: "relative",
  display: "grid",
  minWidth: 0,
  gap: vars.space[5],
  transition: `opacity ${vars.motion.quick} ${vars.motion.easeOut}, scale ${vars.motion.quick} ${vars.motion.easeOut}, transform ${vars.motion.deliberate} ${vars.motion.easeOut}`,
  selectors: {
    "&[data-dragging='true']": {
      zIndex: 3,
      outline: `${vars.size.hairline} solid color-mix(in oklab, ${vars.color.cobalt} 38%, ${vars.color.transparent})`,
      outlineOffset: vars.space[2],
      background: `color-mix(in oklab, ${vars.color.cobaltPale} 12%, ${vars.color.transparent})`,
    },
    "&[data-section-drop='before']::before": {
      position: "absolute",
      zIndex: 5,
      insetBlockStart: `calc(${vars.space[3]} * -1)`,
      insetInline: 0,
      height: vars.size.focusRing,
      borderRadius: vars.radius.round,
      background: vars.color.cobalt,
      content: "",
      pointerEvents: "none",
    },
    "&[data-section-drop='after']::after": {
      position: "absolute",
      zIndex: 5,
      insetBlockEnd: `calc(${vars.space[3]} * -1)`,
      insetInline: 0,
      height: vars.size.focusRing,
      borderRadius: vars.radius.round,
      background: vars.color.cobalt,
      content: "",
      pointerEvents: "none",
    },
  },
});

export const gallerySectionHeader = style({
  display: "flex",
  minWidth: 0,
  paddingBlockStart: vars.space[4],
  alignItems: "end",
  justifyContent: "space-between",
  gap: vars.space[5],
  borderTop: `${vars.size.hairline} solid ${vars.color.graphite}`,
  "@media": {
    "screen and (max-width: 39.99rem)": {
      display: "grid",
      alignItems: "start",
    },
  },
});

globalStyle(`${gallerySectionHeader} > div:first-child`, {
  display: "grid",
  minWidth: 0,
  gap: vars.space[2],
});

globalStyle(`${gallerySectionHeader} h2`, {
  fontSize: "clamp(1.4rem, 4vw, 2.5rem)",
  letterSpacing: "-0.035em",
});

globalStyle(`${gallerySectionHeader} [data-section-description]`, {
  maxWidth: "62ch",
  color: vars.color.graphiteSoft,
});

export const gallerySectionNumber = style({
  color: vars.color.cobaltDark,
  fontFamily: vars.font.mono,
  fontSize: "0.66rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
});

export const gallerySectionMeta = style({
  display: "flex",
  flex: "0 0 auto",
  alignItems: "center",
  gap: vars.space[3],
  color: vars.color.graphiteSoft,
  fontFamily: vars.font.mono,
  fontSize: "0.66rem",
});

export const gallerySectionEditButton = style({
  ...controlReset,
  paddingInline: vars.space[3],
  background: vars.color.paperRaised,
  color: vars.color.graphite,
  fontFamily: vars.font.body,
  fontSize: "0.7rem",
  selectors: {
    "&[data-section-drag]": {
      cursor: "grab",
    },
    "&[data-section-drag]:active": {
      cursor: "grabbing",
    },
    "&[aria-pressed='true']": {
      borderColor: vars.color.cobalt,
      boxShadow: `0 0 0 ${vars.size.focusRing} ${vars.color.cobalt}`,
    },
  },
});

export const galleryGrid = style({
  position: "relative",
  display: "grid",
  width: "100%",
  gridTemplateColumns: "minmax(0, 1fr)",
  columnGap: vars.space[4],
  rowGap: vars.space[8],
  outline: `${vars.size.hairline} solid ${vars.color.transparent}`,
  outlineOffset: vars.space[2],
  selectors: {
    "&[data-drop-active='true']": {
      outlineColor: `color-mix(in oklab, ${vars.color.cobalt} 48%, ${vars.color.transparent})`,
      background: `color-mix(in oklab, ${vars.color.cobaltPale} 18%, ${vars.color.transparent})`,
      boxShadow: `inset 0 0 0 ${vars.size.hairline} color-mix(in oklab, ${vars.color.cobalt} 34%, ${vars.color.transparent})`,
    },
    "&[data-drag-slot-label]::after": {
      position: "absolute",
      zIndex: 5,
      insetBlockStart: "50%",
      insetInlineStart: "50%",
      padding: `${vars.space[2]} ${vars.space[3]}`,
      border: `${vars.size.hairline} solid ${vars.color.cobalt}`,
      borderRadius: vars.radius.round,
      background: vars.color.paperRaised,
      color: vars.color.cobaltDark,
      boxShadow: vars.shadow.raised,
      content: "attr(data-drag-slot-label)",
      fontFamily: vars.font.mono,
      fontSize: "0.66rem",
      fontWeight: vars.weight.semibold,
      pointerEvents: "none",
      transform: "translate(-50%, -50%)",
      whiteSpace: "nowrap",
    },
  },
  "@media": {
    "screen and (min-width: 40rem)": {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    },
    "screen and (min-width: 60rem)": {
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    },
  },
});

export const gallerySectionEmpty = style({
  display: "grid",
  minHeight: "10rem",
  gridColumn: "1 / -1",
  placeItems: "center",
  border: `${vars.size.hairline} dashed ${vars.color.graphiteSoft}`,
  color: vars.color.graphiteSoft,
  fontSize: "0.76rem",
});

globalStyle(
  `${gallerySection}:has(${galleryGrid}[data-drop-active='true']) ${gallerySectionHeader}`,
  {
    borderTopColor: vars.color.cobalt,
    background: `color-mix(in oklab, ${vars.color.cobaltPale} 18%, ${vars.color.transparent})`,
    boxShadow: `inset 0 ${vars.size.hairline} 0 ${vars.color.cobalt}`,
  },
);

globalStyle(
  `${gallerySection}:has(${galleryGrid}[data-drop-active='true']) ${gallerySectionNumber}`,
  {
    color: vars.color.cobaltDark,
  },
);

globalStyle(
  `${galleryGrid}[data-drop-active='true'] ${gallerySectionEmpty}`,
  {
    borderColor: vars.color.cobalt,
    background: vars.color.cobaltPale,
    color: vars.color.cobaltDark,
  },
);

globalStyle(
  `${gallerySection}[data-dragging='true'] ${galleryGrid} > *`,
  {
    opacity: 0.12,
    transition: `opacity ${vars.motion.quick} ${vars.motion.easeOut}`,
    "@media": {
      "(prefers-reduced-motion: reduce)": {
        transition: "none",
      },
    },
  },
);

export const galleryItem = style({
  position: "relative",
  minWidth: 0,
  transition: `opacity ${vars.motion.quick} ${vars.motion.easeOut}, scale ${vars.motion.quick} ${vars.motion.easeOut}, transform ${vars.motion.deliberate} ${vars.motion.easeOut}`,
});

export const galleryItemWide = style({
  "@media": {
    "screen and (min-width: 40rem)": {
      gridColumn: "span 2",
    },
  },
});

export const galleryItemFeature = style({
  "@media": {
    "screen and (min-width: 40rem)": {
      gridColumn: "span 2",
    },
    "screen and (min-width: 60rem)": {
      gridColumn: "1 / -1",
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

globalStyle(
  `${galleryItemWide} ${galleryButton} img, ${galleryItemFeature} ${galleryButton} img`,
  {
    "@media": {
      "screen and (min-width: 40rem)": {
        aspectRatio: "2 / 1",
      },
    },
  },
);

globalStyle(`${galleryItemFeature} ${galleryButton} img`, {
  "@media": {
    "screen and (min-width: 60rem)": {
      aspectRatio: "21 / 9",
    },
  },
});

globalStyle(`${galleryButton}:hover img`, {
  "@media": {
    "(hover: hover) and (pointer: fine)": {
      transform: "scale(1.015)",
    },
  },
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

export const adminToolbar = style({
  ...sectionPad,
  position: "sticky",
  zIndex: 35,
  insetBlockStart: "4.5rem",
  borderBottom: `${vars.size.hairline} solid ${vars.color.line}`,
  background: `color-mix(in oklab, ${vars.color.paperRaised} 94%, ${vars.color.transparent})`,
  backdropFilter: "blur(0.75rem)",
});

export const adminToolbarInner = style({
  display: "flex",
  width: "100%",
  maxWidth: vars.size.content,
  minHeight: "4.25rem",
  marginInline: "auto",
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space[4],
  "@media": {
    "screen and (max-width: 39.99rem)": {
      display: "grid",
      paddingBlock: vars.space[2],
      gap: vars.space[2],
    },
  },
});

export const adminIdentity = style({
  display: "grid",
  minWidth: 0,
  gap: vars.space[1],
});

globalStyle(`${adminIdentity} strong`, {
  fontFamily: vars.font.display,
  fontSize: "0.88rem",
});

globalStyle(`${adminIdentity} span`, {
  overflow: "hidden",
  color: vars.color.graphiteSoft,
  fontFamily: vars.font.mono,
  fontSize: "0.64rem",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const adminToolbarActions = style({
  display: "flex",
  flex: "1 1 auto",
  minWidth: 0,
  alignItems: "center",
  justifyContent: "flex-start",
  gap: vars.space[2],
  overflowX: "auto",
  overscrollBehaviorInline: "contain",
  scrollbarWidth: "thin",
});

export const adminAutoLayoutBar = style({
  ...sectionPad,
  position: "sticky",
  zIndex: 34,
  insetBlockStart: "8.75rem",
  display: "flex",
  width: "100%",
  minHeight: "3.75rem",
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space[4],
  borderBottom: `${vars.size.hairline} solid ${vars.color.cobalt}`,
  background: vars.color.cobaltPale,
  color: vars.color.graphite,
  transition: `opacity ${vars.motion.quick} ${vars.motion.easeOut}, transform ${vars.motion.deliberate} ${vars.motion.easeOut}`,
  selectors: {
    "&[hidden]": {
      display: "none",
    },
  },
  "@media": {
    "screen and (max-width: 39.99rem)": {
      position: "relative",
      insetBlockStart: 0,
      display: "grid",
      paddingBlock: vars.space[3],
      alignItems: "start",
    },
  },
});

globalStyle(`${adminAutoLayoutBar} > div:first-child`, {
  display: "grid",
  gap: vars.space[1],
});

globalStyle(`${adminAutoLayoutBar} strong`, {
  fontFamily: vars.font.display,
  fontSize: "0.84rem",
});

globalStyle(`${adminAutoLayoutBar} span`, {
  color: vars.color.cobaltDark,
  fontFamily: vars.font.mono,
  fontSize: "0.66rem",
  fontVariantNumeric: "tabular-nums",
});

globalStyle(`${adminAutoLayoutBar} > div:last-child`, {
  display: "flex",
  flexWrap: "wrap",
  gap: vars.space[2],
});

export const adminStatus = style({
  display: "inline-flex",
  minHeight: vars.size.control,
  alignItems: "center",
  gap: vars.space[2],
  paddingInline: vars.space[3],
  color: vars.color.graphiteSoft,
  fontSize: "0.72rem",
  whiteSpace: "nowrap",
  transition: `opacity ${vars.motion.quick} ${vars.motion.easeOut}`,
  selectors: {
    "&::before": {
      width: vars.space[2],
      height: vars.space[2],
      borderRadius: vars.radius.round,
      background: vars.color.graphiteSoft,
      content: "",
    },
    "&[data-state='saving']::before": {
      background: vars.color.cobalt,
    },
    "&[data-state='saved']::before": {
      background: vars.color.success,
    },
    "&[data-state='error']::before": {
      background: vars.color.danger,
    },
  },
});

const adminControl = {
  ...controlReset,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  paddingInline: vars.space[3],
  background: vars.color.paperRaised,
  fontSize: "0.74rem",
  fontWeight: vars.weight.medium,
} as const;

export const adminButton = style({
  ...adminControl,
  selectors: {
    "&:hover": {
      "@media": {
        "(hover: hover) and (pointer: fine)": {
          borderColor: vars.color.graphiteSoft,
        },
      },
    },
  },
});

export const adminPrimaryButton = style({
  ...adminControl,
  borderColor: vars.color.cobalt,
  background: vars.color.cobalt,
  color: vars.color.accentInk,
  selectors: {
    "&:hover": {
      "@media": {
        "(hover: hover) and (pointer: fine)": {
          background: vars.color.cobaltDark,
        },
      },
    },
  },
});

export const galleryDragGhost = style({
  position: "fixed",
  zIndex: 1,
  insetBlockStart: 0,
  insetInlineStart: "-200%",
  display: "grid",
  width: "16rem",
  minHeight: vars.space[16],
  gridTemplateColumns: `${vars.space[16]} minmax(0, 1fr)`,
  alignItems: "stretch",
  overflow: "hidden",
  border: `${vars.size.hairline} solid ${vars.color.graphite}`,
  borderBlockStart: `${vars.size.focusRing} solid ${vars.color.cobalt}`,
  borderRadius: vars.radius.control,
  background: vars.color.paperRaised,
  color: vars.color.graphite,
  boxShadow: vars.shadow.raised,
  opacity: 0.96,
  pointerEvents: "none",
  selectors: {
    "&[data-drag-ghost-kind='section']": {
      width: "14rem",
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
});

globalStyle(`${galleryDragGhost} > img`, {
  width: "100%",
  height: "100%",
  objectFit: "cover",
});

globalStyle(`${galleryDragGhost} > div`, {
  display: "grid",
  minWidth: 0,
  alignContent: "center",
  gap: vars.space[1],
  padding: vars.space[3],
});

globalStyle(`${galleryDragGhost} [data-drag-ghost-kind-label]`, {
  color: vars.color.cobaltDark,
  fontFamily: vars.font.mono,
  fontSize: "0.62rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
});

globalStyle(`${galleryDragGhost} [data-drag-ghost-title]`, {
  overflow: "hidden",
  fontFamily: vars.font.display,
  fontSize: "0.88rem",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

globalStyle(`${galleryDragGhost} [data-drag-ghost-meta]`, {
  overflow: "hidden",
  color: vars.color.graphiteSoft,
  fontFamily: vars.font.mono,
  fontSize: "0.62rem",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const galleryEditable = style({
  selectors: {
    "&[data-dragging='true']": {
      zIndex: 3,
      outline: `${vars.size.hairline} solid color-mix(in oklab, ${vars.color.cobalt} 42%, ${vars.color.transparent})`,
      outlineOffset: vars.space[1],
      background: `color-mix(in oklab, ${vars.color.cobaltPale} 36%, ${vars.color.paperRaised})`,
    },
    "&[data-item-drop='block-before']::before": {
      position: "absolute",
      zIndex: 4,
      insetBlockStart: `calc(${vars.space[2]} * -1)`,
      insetInline: vars.space[2],
      height: vars.size.focusRing,
      borderRadius: vars.radius.round,
      background: vars.color.cobalt,
      content: "",
      pointerEvents: "none",
    },
    "&[data-item-drop='block-after']::after": {
      position: "absolute",
      zIndex: 4,
      insetBlockEnd: `calc(${vars.space[2]} * -1)`,
      insetInline: vars.space[2],
      height: vars.size.focusRing,
      borderRadius: vars.radius.round,
      background: vars.color.cobalt,
      content: "",
      pointerEvents: "none",
    },
    "&[data-item-drop='inline-before']::before": {
      position: "absolute",
      zIndex: 4,
      insetBlock: vars.space[2],
      insetInlineStart: `calc(${vars.space[2]} * -1)`,
      width: vars.size.focusRing,
      borderRadius: vars.radius.round,
      background: vars.color.cobalt,
      content: "",
      pointerEvents: "none",
    },
    "&[data-item-drop='inline-after']::after": {
      position: "absolute",
      zIndex: 4,
      insetBlock: vars.space[2],
      insetInlineEnd: `calc(${vars.space[2]} * -1)`,
      width: vars.size.focusRing,
      borderRadius: vars.radius.round,
      background: vars.color.cobalt,
      content: "",
      pointerEvents: "none",
    },
    "&[data-drag-slot-label]::after": {
      position: "absolute",
      zIndex: 5,
      insetBlockStart: "50%",
      insetInlineStart: "50%",
      padding: `${vars.space[2]} ${vars.space[3]}`,
      border: `${vars.size.hairline} solid ${vars.color.cobalt}`,
      borderRadius: vars.radius.round,
      background: vars.color.paperRaised,
      color: vars.color.cobaltDark,
      boxShadow: vars.shadow.raised,
      content: "attr(data-drag-slot-label)",
      fontFamily: vars.font.mono,
      fontSize: "0.66rem",
      fontWeight: vars.weight.semibold,
      pointerEvents: "none",
      transform: "translate(-50%, -50%)",
      whiteSpace: "nowrap",
    },
  },
});

globalStyle(
  `${galleryEditable}[data-dragging='true'][data-drag-slot-label] > button, ${galleryEditable}[data-dragging='true'][data-drag-slot-label] > figcaption`,
  {
    opacity: 0.12,
    pointerEvents: "none",
    transition: `opacity ${vars.motion.quick} ${vars.motion.easeOut}`,
    "@media": {
      "(prefers-reduced-motion: reduce)": {
        transition: "none",
      },
    },
  },
);

export const galleryEditorButton = style({
  position: "relative",
  cursor: "grab",
  selectors: {
    "&[aria-pressed='true']": {
      borderColor: vars.color.cobalt,
      boxShadow: `0 0 0 ${vars.size.focusRing} ${vars.color.cobalt}`,
    },
    "&:active": {
      cursor: "grabbing",
      transform: "none",
    },
  },
});

export const galleryOrderBadge = style({
  position: "absolute",
  zIndex: 2,
  insetBlockStart: vars.space[2],
  insetInlineStart: vars.space[2],
  display: "grid",
  minWidth: vars.size.control,
  minHeight: vars.size.control,
  paddingInline: vars.space[2],
  placeItems: "center",
  border: `${vars.size.hairline} solid ${vars.color.inverseSoft}`,
  borderRadius: vars.radius.control,
  background: `color-mix(in oklab, ${vars.color.graphite} 86%, ${vars.color.transparent})`,
  color: vars.color.inverse,
  fontFamily: vars.font.mono,
  fontSize: "0.66rem",
  pointerEvents: "none",
  transition: `opacity ${vars.motion.quick} ${vars.motion.easeOut}`,
});

export const galleryLayoutLockMark = style({
  position: "absolute",
  zIndex: 2,
  insetBlockStart: vars.space[2],
  insetInlineEnd: vars.space[2],
  padding: `${vars.space[1]} ${vars.space[2]}`,
  border: `${vars.size.hairline} solid ${vars.color.inverseSoft}`,
  borderRadius: vars.radius.control,
  background: `color-mix(in oklab, ${vars.color.graphite} 86%, ${vars.color.transparent})`,
  color: vars.color.inverse,
  fontFamily: vars.font.mono,
  fontSize: "0.6rem",
  fontWeight: vars.weight.semibold,
  letterSpacing: "0.06em",
  pointerEvents: "none",
  textTransform: "uppercase",
});

export const adminInspector = style({
  position: "fixed",
  zIndex: 60,
  insetInline: 0,
  insetBlockEnd: 0,
  display: "grid",
  maxHeight: "52dvh",
  gridTemplateRows: "auto minmax(0, 1fr)",
  borderTop: `${vars.size.hairline} solid ${vars.color.graphite}`,
  background: vars.color.paperRaised,
  boxShadow: vars.shadow.raised,
  opacity: 0,
  pointerEvents: "none",
  transform: "translateY(100%)",
  transition: `opacity ${vars.motion.quick} ${vars.motion.easeOut}, transform ${vars.motion.deliberate} ${vars.motion.easeOut}`,
  "@media": {
    "screen and (min-width: 64rem)": {
      insetBlock: "8.75rem 0",
      insetInline: "auto 0",
      width: "min(24rem, 100%)",
      maxHeight: "none",
      borderTop: 0,
      borderInlineStart: `${vars.size.hairline} solid ${vars.color.graphite}`,
      transform: "translateX(100%)",
    },
  },
});

globalStyle(`${adminInspector}[data-open='true']`, {
  opacity: 1,
  pointerEvents: "auto",
  transform: "none",
});

globalStyle(
  `[data-gallery-admin]:has(${adminInspector}[data-open='true']) ${galleryMasthead}, [data-gallery-admin]:has(${adminInspector}[data-open='true']) ${gallerySections}`,
  {
    "@media": {
      "screen and (min-width: 64rem)": {
        width: "calc(100% - 24rem)",
        marginInlineStart: "auto",
        marginInlineEnd: "24rem",
      },
    },
  },
);

globalStyle(
  `[data-gallery-admin]:has(${adminInspector}[data-open='true']) ${gallerySections}`,
  {
    paddingBlockEnd: `calc(52dvh + ${vars.space[16]})`,
    "@media": {
      "screen and (min-width: 64rem)": {
        paddingBlockEnd: vars.space[16],
      },
    },
  },
);

globalStyle(
  `[data-gallery-admin]:has(${adminInspector}[data-open='true']) ${galleryGrid}`,
  {
    "@media": {
      "screen and (min-width: 64rem) and (max-width: 87.99rem)": {
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      },
    },
  },
);

globalStyle(
  `[data-gallery-admin]:has(${adminInspector}[data-open='true']) ${galleryEditable}:has(${galleryEditorButton}[aria-pressed='true'])`,
  {
    scrollMarginBlockStart: "9.75rem",
    scrollMarginBlockEnd: "54dvh",
    "@media": {
      "screen and (min-width: 64rem)": {
        scrollMarginBlockStart: 0,
        scrollMarginBlockEnd: 0,
      },
    },
  },
);

export const adminInspectorHeader = style({
  display: "flex",
  minHeight: "4.5rem",
  paddingInline: vars.space[4],
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space[4],
  borderBottom: `${vars.size.hairline} solid ${vars.color.line}`,
});

globalStyle(`${adminInspectorHeader} div`, {
  display: "grid",
  minWidth: 0,
  gap: vars.space[1],
});

globalStyle(`${adminInspectorHeader} strong`, {
  overflow: "hidden",
  fontFamily: vars.font.display,
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

globalStyle(`${adminInspectorHeader} span`, {
  color: vars.color.graphiteSoft,
  fontFamily: vars.font.mono,
  fontSize: "0.64rem",
});

export const adminInspectorBody = style({
  display: "grid",
  alignContent: "start",
  padding: vars.space[4],
  gap: vars.space[5],
  overflowY: "auto",
});

export const adminField = style({
  display: "grid",
  gap: vars.space[2],
  color: vars.color.graphiteSoft,
  fontSize: "0.7rem",
});

globalStyle(`${adminField} input, ${adminField} textarea, ${adminField} select`, {
  width: "100%",
  minHeight: vars.size.control,
  padding: `${vars.space[2]} ${vars.space[3]}`,
  border: `${vars.size.hairline} solid ${vars.color.line}`,
  borderRadius: vars.radius.control,
  background: vars.color.paper,
  color: vars.color.graphite,
});

globalStyle(`${adminField} textarea`, {
  minHeight: "6.5rem",
  resize: "vertical",
});

export const adminFieldRow = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: vars.space[3],
});

export const adminInspectorActions = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: vars.space[2],
  paddingBlockStart: vars.space[3],
  borderTop: `${vars.size.hairline} solid ${vars.color.line}`,
});

export const adminInspectorHint = style({
  color: vars.color.graphiteSoft,
  fontSize: "0.72rem",
});

globalStyle(`[data-gallery-admin][data-preview='true'] ${galleryOrderBadge}`, {
  opacity: 0,
});

globalStyle(`[data-gallery-admin][data-preview='true'] ${galleryEditorButton}`, {
  cursor: "zoom-in",
});

globalStyle(
  `[data-gallery-admin][data-preview='true'] ${gallerySectionEditButton}, [data-gallery-admin][data-preview='true'] ${gallerySectionEmpty}`,
  {
    display: "none",
  },
);

globalStyle("[data-gallery-admin]::after", {
  position: "fixed",
  zIndex: 80,
  insetInlineStart: "50%",
  insetBlockEnd: `max(${vars.space[4]}, env(safe-area-inset-bottom))`,
  display: "block",
  maxWidth: `calc(100vw - ${vars.space[8]})`,
  padding: `${vars.space[2]} ${vars.space[4]}`,
  overflow: "hidden",
  border: `${vars.size.hairline} solid ${vars.color.cobaltDark}`,
  borderRadius: vars.radius.round,
  background: vars.color.cobalt,
  boxShadow: vars.shadow.raised,
  color: vars.color.accentInk,
  content: "attr(data-drag-label)",
  fontFamily: vars.font.mono,
  fontSize: "0.72rem",
  fontWeight: vars.weight.semibold,
  lineHeight: 1.3,
  opacity: 0,
  pointerEvents: "none",
  textOverflow: "ellipsis",
  transform: `translate(-50%, ${vars.space[2]})`,
  transition: `opacity ${vars.motion.quick} ${vars.motion.easeOut}, transform ${vars.motion.quick} ${vars.motion.easeOut}`,
  whiteSpace: "nowrap",
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      transform: "translate(-50%, 0)",
      transition: "none",
    },
  },
});

globalStyle(
  "[data-gallery-admin][data-drag-active]:not([data-drag-active='false'])[data-drag-label-fallback='true']::after",
  {
    opacity: 1,
    transform: "translate(-50%, 0)",
  },
);

globalStyle(
  `[data-gallery-admin]:has(${adminInspector}[data-open='true'])::after`,
  {
    "@media": {
      "screen and (max-width: 63.99rem)": {
        insetBlockEnd: `calc(52dvh + ${vars.space[4]})`,
      },
    },
  },
);

globalStyle(
  `${gallerySection}[data-dragging='true'], ${galleryEditable}[data-dragging='true']`,
  {
    "@media": {
      "(prefers-reduced-motion: reduce)": {
        scale: "none",
      },
    },
  },
);

export const adminToast = style({
  position: "fixed",
  zIndex: 70,
  insetInlineStart: vars.space[4],
  insetBlockEnd: vars.space[4],
  maxWidth: `calc(100% - ${vars.space[8]})`,
  padding: `${vars.space[3]} ${vars.space[4]}`,
  border: `${vars.size.hairline} solid ${vars.color.graphite}`,
  borderRadius: vars.radius.control,
  background: vars.color.graphite,
  color: vars.color.inverse,
  fontSize: "0.78rem",
  opacity: 0,
  pointerEvents: "none",
  transform: `translateY(${vars.space[2]})`,
  transition: `opacity ${vars.motion.quick} ${vars.motion.easeOut}, transform ${vars.motion.quick} ${vars.motion.easeOut}`,
  selectors: {
    "&[data-open='true']": {
      opacity: 1,
      transform: "none",
    },
  },
});

export const directoryLayout = style({
  ...sectionPad,
  display: "grid",
  width: "100%",
  maxWidth: vars.size.content,
  marginInline: "auto",
  paddingBlock: `${vars.space[10]} ${vars.space[16]}`,
  gap: vars.space[12],
  "@media": {
    "screen and (min-width: 60rem)": {
      gridTemplateColumns: "minmax(15rem, 4fr) minmax(0, 8fr)",
      alignItems: "start",
      paddingBlock: `${vars.space[12]} ${vars.space[20]}`,
      gap: vars.space[16],
    },
  },
});

export const directoryHeader = style({
  display: "grid",
  minWidth: 0,
  alignContent: "start",
  gap: vars.space[6],
  "@media": {
    "screen and (min-width: 60rem)": {
      position: "sticky",
      insetBlockStart: `calc(4.5rem + ${vars.space[8]})`,
    },
  },
});

globalStyle(`${directoryHeader} > p`, {
  maxWidth: "48ch",
  color: vars.color.graphiteSoft,
});

export const directoryBody = style({
  display: "grid",
  minWidth: 0,
  gap: vars.space[12],
});

export const otherDirectory = style({
  "@media": {
    "screen and (min-width: 48rem)": {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      alignItems: "start",
      columnGap: vars.space[8],
      rowGap: vars.space[12],
    },
  },
});

export const directoryGroup = style({
  display: "grid",
  minWidth: 0,
  alignContent: "start",
  gap: vars.space[4],
});

globalStyle(`${directoryGroup} h2`, {
  fontSize: "1.05rem",
  letterSpacing: "-0.015em",
});

export const contactIndex = style({
  display: "grid",
  minWidth: 0,
  borderTop: `${vars.size.hairline} solid ${vars.color.graphite}`,
});

globalStyle(`${contactIndex} > a`, {
  display: "grid",
  gridTemplateColumns: "minmax(3rem, auto) minmax(0, 1fr) auto",
  alignItems: "center",
  minWidth: 0,
  minHeight: "5.25rem",
  gap: vars.space[4],
  borderBottom: `${vars.size.hairline} solid ${vars.color.line}`,
});

globalStyle(`${contactIndex} > a > span:first-child`, {
  color: vars.color.graphiteSoft,
  fontFamily: vars.font.body,
  fontSize: "0.7rem",
});

globalStyle(`${contactIndex} strong`, {
  minWidth: 0,
  overflowWrap: "anywhere",
  fontFamily: vars.font.display,
  fontSize: "clamp(1rem, 4.5vw, 1.75rem)",
  whiteSpace: "nowrap",
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
  minWidth: 0,
  minHeight: "4.75rem",
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
  whiteSpace: "nowrap",
});

globalStyle(`${linkIndex} small`, {
  color: vars.color.graphiteSoft,
});

export const toolMasthead = style({
  ...sectionPad,
  display: "grid",
  width: "100%",
  maxWidth: vars.size.content,
  marginInline: "auto",
  paddingBlock: `${vars.space[8]} ${vars.space[6]}`,
  gap: vars.space[5],
  borderBottom: `${vars.size.hairline} solid ${vars.color.line}`,
  "@media": {
    "screen and (min-width: 48rem)": {
      gridTemplateColumns:
        "minmax(0, 5fr) minmax(17rem, 4fr) minmax(10rem, 3fr)",
      alignItems: "end",
      paddingBlock: `${vars.space[10]} ${vars.space[8]}`,
      gap: vars.space[8],
    },
  },
});

globalStyle(`${toolMasthead} h1`, {
  fontSize: "clamp(1.85rem, 4vw, 3rem)",
});

export const toolLede = style({
  maxWidth: "56ch",
  color: vars.color.graphiteSoft,
});

export const toolFacts = style({
  display: "grid",
  minWidth: 0,
  borderTop: `${vars.size.hairline} solid ${vars.color.graphite}`,
});

globalStyle(`${toolFacts} > div`, {
  display: "grid",
  gridTemplateColumns: "minmax(5rem, 0.45fr) minmax(0, 1fr)",
  paddingBlock: vars.space[2],
  gap: vars.space[3],
  borderBottom: `${vars.size.hairline} solid ${vars.color.line}`,
});

globalStyle(`${toolFacts} dt`, {
  color: vars.color.graphiteSoft,
  fontSize: "0.66rem",
});

globalStyle(`${toolFacts} dd`, {
  fontFamily: vars.font.body,
  fontSize: "0.72rem",
});

export const runtimeGrid = style({
  ...sectionPad,
  display: "grid",
  width: "100%",
  maxWidth: vars.size.content,
  marginInline: "auto",
  paddingBlock: vars.space[4],
  gap: vars.space[3],
  "@media": {
    "screen and (min-width: 60rem)": {
      gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
      minHeight: "38rem",
      paddingBlock: vars.space[6],
    },
  },
});

export const editorPane = style({
  display: "grid",
  minWidth: 0,
  minHeight: "27rem",
  gridTemplateRows: "auto minmax(18rem, 1fr) auto",
  border: `${vars.size.hairline} solid ${vars.color.line}`,
  background: vars.color.paperRaised,
});

export const toolBar = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  minHeight: "3.5rem",
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
  minHeight: "27rem",
  gridTemplateRows: "3.5rem minmax(0, 1fr)",
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
  minHeight: "23.5rem",
  border: 0,
  background: vars.color.paperRaised,
});

export const securityNote = style({
  ...sectionPad,
  display: "grid",
  width: "100%",
  maxWidth: vars.size.content,
  marginInline: "auto",
  paddingBlock: `${vars.space[6]} ${vars.space[16]}`,
  gap: vars.space[3],
  borderTop: `${vars.size.hairline} solid ${vars.color.line}`,
  "@media": {
    "screen and (min-width: 48rem)": {
      gridTemplateColumns: "minmax(12rem, 0.6fr) minmax(0, 1.4fr)",
      gap: vars.space[8],
    },
  },
});

globalStyle(`${securityNote} h2`, {
  fontSize: "1.2rem",
});

globalStyle(`${securityNote} p`, {
  maxWidth: vars.size.reading,
  color: vars.color.graphiteSoft,
});

export const notFound = style({
  ...sectionPad,
  display: "grid",
  width: "100%",
  maxWidth: vars.size.content,
  minHeight: "calc(100svh - 10.5rem)",
  marginInline: "auto",
  alignItems: "center",
  paddingBlock: vars.space[12],
});

globalStyle(`${notFound} > div`, {
  display: "grid",
  width: "100%",
  maxWidth: "42rem",
  justifyItems: "start",
  gap: vars.space[6],
});

globalStyle(`${notFound} > div > p:not(${meta})`, {
  maxWidth: vars.size.reading,
  color: vars.color.graphiteSoft,
});

globalStyle(`${notFound} a`, {
  width: "fit-content",
  minWidth: "11rem",
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
