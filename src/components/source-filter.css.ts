import { style } from "@vanilla-extract/css";

export const sourceFilterDesktop = style({
  "@media": {
    "(max-width: 767px)": {
      display: "none",
    },
  },
});

export const sourceFilterMobile = style({
  "@media": {
    "(min-width: 768px)": {
      display: "none",
    },
  },
});
