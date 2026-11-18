import { createTheme } from "@mantine/core";

const PRETENDARD =
  '"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", system-ui, sans-serif';

export const theme = createTheme({
  primaryColor: "brand",
  defaultRadius: "md",
  fontFamily: PRETENDARD,
  fontSizes: {
    xs: "12px",
    sm: "14px",
    md: "16px",
    lg: "18px",
    xl: "22px",
  },
  lineHeights: {
    xs: "1.4",
    sm: "1.5",
    md: "1.6",
    lg: "1.7",
    xl: "1.8",
  },
  headings: {
    fontWeight: "600",
    fontFamily: PRETENDARD,
    sizes: {
      h1: { fontSize: "1.75rem", lineHeight: "1.3" },
      h2: { fontSize: "1.5rem", lineHeight: "1.3" },
      h3: { fontSize: "1.25rem", lineHeight: "1.3" },
      h4: { fontSize: "1.125rem", lineHeight: "1.35" },
      h5: { fontSize: "1rem", lineHeight: "1.4" },
      h6: { fontSize: "0.9375rem", lineHeight: "1.4" },
    },
  },
  shadows: {
    xs: "0 1px 2px rgba(0, 0, 0, 0.04)",
    sm: "0 1px 3px rgba(0, 0, 0, 0.05)",
    md: "0 2px 8px rgba(0, 0, 0, 0.06)",
    lg: "0 4px 12px rgba(0, 0, 0, 0.07)",
    xl: "0 8px 24px rgba(0, 0, 0, 0.08)",
  },
  colors: {
    brand: [
      "#eef3fa", "#dbe7f4", "#b8cde8", "#8faed7",
      "#6188c1", "#3f67a4", "#2c5087", "#233f6c",
      "#1c3254", "#13233c",
    ],
    gray: [
      "#f6f7f9", "#ebedf2", "#d9dde5", "#c0c6d2",
      "#9aa1b3", "#727a8e", "#595f73", "#444a5c",
      "#2f3340", "#1a1d27",
    ],
    red: [
      "#fbf3f3", "#f4e3e3", "#e6c8c8", "#d3a5a5",
      "#bb7878", "#a15656", "#883e3e", "#6f3232",
      "#5a2828", "#452020",
    ],
    yellow: [
      "#fef9ec", "#fcedc8", "#f7da90", "#f0c255",
      "#e6a72e", "#cf8f1e", "#ad771a", "#8a5f1a",
      "#6e4b1b", "#523817",
    ],
    orange: [
      "#fdf4ee", "#fae5d3", "#f3c59e", "#eaa56c",
      "#db8040", "#c66328", "#a4501f", "#83421d",
      "#68341b", "#4e2817",
    ],
    green: [
      "#f0f7f1", "#dcebe0", "#b6d6bf", "#8bba9a",
      "#5e9a72", "#3f7c54", "#306343", "#264f37",
      "#1d3d2c", "#142b20",
    ],
    teal: [
      "#eef7f5", "#d3ebe7", "#a8d4cd", "#78bab1",
      "#4b9990", "#2e7a72", "#24635c", "#1d4f4a",
      "#173d39", "#102b28",
    ],
  },
  components: {
    Button: {
      defaultProps: { fw: 500 },
      styles: {
        root: {
          transition:
            "background-color 150ms ease, border-color 150ms ease, color 150ms ease",
        },
      },
    },
    ActionIcon: {
      defaultProps: { size: "md" },
    },
    TextInput: {
      styles: {
        input: {
          transition: "border-color 150ms ease, box-shadow 150ms ease",
        },
      },
    },
    PasswordInput: {
      styles: {
        input: {
          transition: "border-color 150ms ease, box-shadow 150ms ease",
        },
      },
    },
    Textarea: {
      styles: {
        input: {
          transition: "border-color 150ms ease, box-shadow 150ms ease",
        },
      },
    },
    Select: {
      styles: {
        input: {
          transition: "border-color 150ms ease, box-shadow 150ms ease",
        },
      },
    },
    NumberInput: {
      styles: {
        input: {
          transition: "border-color 150ms ease, box-shadow 150ms ease",
        },
      },
    },
    Paper: {
      defaultProps: { radius: "lg" },
    },
    Card: {
      defaultProps: { radius: "lg" },
    },
    Badge: {
      defaultProps: { radius: "sm" },
      styles: {
        root: { fontWeight: 500 },
      },
    },
    Tabs: {
      styles: {
        tab: { fontWeight: 500 },
      },
    },
    Anchor: {
      styles: {
        root: {
          fontWeight: 500,
          "&:hover": { textDecoration: "underline" },
        },
      },
    },
    Title: {
      styles: {
        root: { letterSpacing: "-0.01em" },
      },
    },
    Notification: {
      defaultProps: { radius: "md" },
    },
    Alert: {
      defaultProps: { radius: "md" },
    },
    Menu: {
      defaultProps: { shadow: "sm" },
    },
    Tooltip: {
      defaultProps: { withArrow: true },
    },
    SegmentedControl: {
      styles: {
        label: { fontWeight: 500 },
      },
    },
  },
});
