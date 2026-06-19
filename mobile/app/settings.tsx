import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, globalStyles } from "../src/theme";

export default function SettingsScreen() {
  const [autoStoryboard, setAutoStoryboard] = useState(true);
  const [autoShootList, setAutoShootList] = useState(true);

  const Toggle = ({ value, onToggle }: { value: boolean; onToggle: (v: boolean) => void }) => (
    <TouchableOpacity
      onPress={() => onToggle(!value)}
      style={[styles.toggle, value && { backgroundColor: colors.accent }]}
    >
      <View style={[styles.toggleDot, value && { left: 22 }]} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={globalStyles.container}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={styles.title}>Settings</Text>

        <View style={[globalStyles.card, { marginBottom: 16 }]}>
          <Text style={styles.sectionTitle}>Generation</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Auto-generate storyboards</Text>
              <Text style={styles.rowDesc}>Generate frames after Scriptment</Text>
            </View>
            <Toggle value={autoStoryboard} onToggle={setAutoStoryboard} />
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Auto-generate shoot list</Text>
              <Text style={styles.rowDesc}>Create shot list after storyboards</Text>
            </View>
            <Toggle value={autoShootList} onToggle={setAutoShootList} />
          </View>
        </View>

        <View style={[globalStyles.card, { marginBottom: 16 }]}>
          <Text style={styles.sectionTitle}>External APIs</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>DeepSeek API (Scriptments)</Text>
            <Text style={{ fontSize: 11, color: colors.accent }}>Required</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Gemini API (Images)</Text>
            <Text style={{ fontSize: 11, color: colors.success }}>Optional</Text>
          </View>
          <Text style={[styles.rowDesc, { marginTop: 8 }]}>
            Configure API keys in backend/.env on your server.
          </Text>
        </View>

        <View style={[globalStyles.card, { marginBottom: 16 }]}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.rowDesc}>Director's Eye v1.0</Text>
          <Text style={styles.rowDesc}>All AI via external APIs</Text>
          <Text style={[styles.rowDesc, { color: colors.textMuted, marginTop: 8 }]}>
            Built for solo filmmakers who want to plan before they shoot.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "600", color: colors.text, marginBottom: 24 },
  sectionTitle: { fontSize: 15, color: colors.text, fontWeight: "600", marginBottom: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  rowLabel: { fontSize: 14, color: colors.text },
  rowDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  toggle: {
    width: 40,
    height: 22,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    padding: 2,
  },
  toggleDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.text,
  },
});
