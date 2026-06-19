import React, { useState, useCallback } from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";

interface Props {
  text: string;
  label?: string;
}

export default function DirectorNote({ text, label = "Director Note" }: Props) {
  const [speaking, setSpeaking] = useState(false);

  const handlePress = useCallback(() => {
    if (speaking) {
      // In RN we'd use expo-speech or a native TTS module
      setSpeaking(false);
    } else {
      setSpeaking(true);
      // expo-speech integration would go here
      setTimeout(() => setSpeaking(false), 1000);
    }
  }, [speaking, text]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={[styles.button, speaking && styles.activeButton]}
    >
      <Ionicons
        name={speaking ? "volume-high" : "volume-mute"}
        size={14}
        color={speaking ? colors.accent : colors.textSecondary}
      />
      <Text style={[styles.label, speaking && styles.activeLabel]}>
        {speaking ? "Playing..." : label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignSelf: "flex-start",
  },
  activeButton: {
    backgroundColor: "rgba(200,149,108,0.15)",
    borderWidth: 1,
    borderColor: "rgba(200,149,108,0.3)",
  },
  label: {
    fontSize: 10,
    color: colors.textSecondary,
    fontFamily: "System",
  },
  activeLabel: {
    color: colors.accent,
  },
});
