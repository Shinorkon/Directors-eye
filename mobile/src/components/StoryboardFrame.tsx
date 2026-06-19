import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { colors } from "../theme";

interface StoryboardFrameProps {
  imageUrl?: string;
  beatNumber: number;
  shotType: string;
  description: string;
  onPress?: () => void;
}

export default function StoryboardFrame({
  imageUrl,
  beatNumber,
  shotType,
  description,
  onPress,
}: StoryboardFrameProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.container}>
      <View style={styles.frame}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>No frame</Text>
          </View>
        )}
      </View>
      <View style={styles.overlay}>
        <Text style={styles.label}>BEAT {beatNumber}</Text>
        <Text style={styles.type}>{shotType.toUpperCase()}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: colors.surface,
    marginBottom: 12,
  },
  frame: {
    aspectRatio: 2.39 / 1,
    backgroundColor: colors.surfaceHover,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  label: {
    fontSize: 10,
    color: colors.text,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  type: {
    fontSize: 10,
    color: colors.textSecondary,
  },
});
