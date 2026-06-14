import type { GlobalThemeOverrides } from "naive-ui";
import { darkTheme } from "naive-ui";

/** GitGame 暗色主题，供 Naive UI 使用 */
export const gitgameDarkTheme = darkTheme;

/** Naive UI 主题覆盖，贴近项目金色 accent */
export const gitgameThemeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: "#f2bd4b",
    primaryColorHover: "#f5cb6a",
    primaryColorPressed: "#d9a83e",
    bodyColor: "#12100e",
    cardColor: "#1f1c18",
    modalColor: "#1f1c18",
    borderColor: "rgba(242, 189, 75, 0.12)",
    textColor1: "#f5f0e8",
    textColor2: "#9a9288",
    textColor3: "#6b645c",
  },
  Button: {
    borderRadiusMedium: "8px",
  },
  Input: {
    borderRadius: "8px",
    color: "#1a1714",
    colorFocus: "#1a1714",
  },
  Card: {
    borderRadius: "10px",
  },
};
