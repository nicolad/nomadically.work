import { style } from "@vanilla-extract/css";

export const jobListCard = style({
  background: "var(--gray-2)",
  border: "1px solid var(--gray-6)",
  borderRadius: 8,
  overflow: "hidden",
  margin: "0 4px",
});

export const jobRow = style({
  display: "flex",
  alignItems: "flex-start",
  gap: 14,
  padding: "16px 20px",
  borderBottom: "1px solid var(--gray-5)",
  background: "transparent",
  transition: "background 0.12s",
  textDecoration: "none",
  color: "inherit",
  cursor: "pointer",
  ":hover": {
    background: "var(--gray-3)",
  },
  selectors: {
    "&:last-child": {
      borderBottom: "none",
    },
  },
  "@media": {
    "(max-width: 968px)": {
      padding: "10px",
      gap: 10,
    },
  },
});

export const jobRowContent = style({
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 6,
});

export const jobRowTitleLine = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
});

export const jobRowTitle = style({
  fontSize: 17,
  fontWeight: 600,
  color: "var(--gray-12)",
  lineHeight: 1.4,
  letterSpacing: "-0.005em",
  "@media": {
    "(max-width: 968px)": {
      fontSize: 15,
    },
  },
});

export const jobRowCompany = style({
  fontSize: 14,
  fontWeight: 500,
  color: "var(--gray-11)",
  cursor: "pointer",
  textDecoration: "none",
  transition: "color 0.12s",
  lineHeight: 1.4,
  ":hover": {
    color: "var(--gray-12)",
    textDecoration: "underline",
    textUnderlineOffset: "2px",
  },
});

export const jobRowMetaLine = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 3,
});

export const jobRowMetaItem = style({
  fontSize: 13,
  color: "var(--gray-11)",
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
});

export const jobRowMetaBadge = style({
  fontSize: 12,
  padding: "1px 6px",
  border: "1px solid var(--gray-6)",
  color: "var(--gray-11)",
  borderRadius: 3,
  textTransform: "lowercase",
  background: "var(--gray-3)",
});

export const jobRowActions = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginLeft: "auto",
  flexShrink: 0,
  paddingTop: 1,
  "@media": {
    "(max-width: 968px)": {
      gap: 4,
    },
  },
});
