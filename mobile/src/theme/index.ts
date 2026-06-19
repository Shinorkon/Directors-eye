import { StyleSheet } from "react-native";

export const colors = {
  bg: "#0F0F0F",
  surface: "#1A1A1A",
  surfaceHover: "#232323",
  border: "rgba(255,255,255,0.06)",
  borderHover: "rgba(255,255,255,0.12)",
  text: "#F0EBE3",
  textSecondary: "#8A8279",
  textMuted: "#5A544D",
  accent: "#C8956C",
  accentHover: "#D4A67E",
  success: "#7BAE7F",
  error: "#ef4444",
  dot: "#2A2520",
};

export const fonts = {
  display: "System",
  mono: "System",
};

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.text,
    fontWeight: "600",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 10,
    color: colors.textMuted,
    fontFamily: fonts.mono,
    letterSpacing: 0.5,
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  buttonText: {
    color: colors.bg,
    fontSize: 14,
    fontWeight: "600",
  },
});
