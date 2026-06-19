import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors } from "../theme";

interface Beat {
  beatNumber: number;
  description: string;
  motivation: string;
  shotType: string;
  emotionalTone: string;
}

interface Props {
  beat: Beat;
  isActive: boolean;
  onPress: () => void;
  index: number;
}

export default function BeatCard({ beat, isActive, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.card, isActive && styles.activeCard]}
    >
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <Text style={styles.beatNumber}>#{beat.beatNumber}</Text>
          <Text style={styles.shotType}>{beat.shotType}</Text>
          <Text style={styles.tone}>{beat.emotionalTone}</Text>
        </View>
      </View>
      <Text style={styles.description} numberOfLines={2}>
        {beat.description}
      </Text>
      <Text style={styles.motivation} numberOfLines={1}>
        {beat.motivation}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  activeCard: {
    backgroundColor: colors.surfaceHover,
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    borderTopColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "transparent",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  beatNumber: {
    fontSize: 10,
    color: colors.accent,
    backgroundColor: "rgba(200,149,108,0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: "600",
  },
  shotType: {
    fontSize: 10,
    color: colors.textSecondary,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tone: {
    fontSize: 10,
    color: "rgba(255,255,255,0.8)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "#4A5568",
  },
  description: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
    marginBottom: 4,
  },
  motivation: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
});
