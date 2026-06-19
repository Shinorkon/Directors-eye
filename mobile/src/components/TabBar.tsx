import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";

const tabs = [
  { name: "Home", icon: "home-outline", activeIcon: "home", route: "/" },
  { name: "Projects", icon: "film-outline", activeIcon: "film", route: "/archive" },
  { name: "Settings", icon: "settings-outline", activeIcon: "settings", route: "/settings" },
  { name: "Gear", icon: "camera-outline", activeIcon: "camera", route: "/gear" },
] as const;

interface TabBarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

export default function TabBar({ currentRoute, onNavigate }: TabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      {tabs.map((tab) => {
        const isActive = currentRoute === tab.route;
        return (
          <TouchableOpacity
            key={tab.route}
            onPress={() => onNavigate(tab.route)}
            activeOpacity={0.7}
            style={styles.tab}
          >
            <Ionicons
              name={isActive ? tab.activeIcon : tab.icon}
              size={22}
              color={isActive ? colors.accent : colors.textMuted}
            />
            <Text
              style={[
                styles.tabLabel,
                isActive && { color: colors.accent },
              ]}
            >
              {tab.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  tabLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: "500",
  },
});
