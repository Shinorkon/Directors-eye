import React from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, globalStyles } from "../src/theme";
import { defaultGear } from "../src/data/demo";

export default function GearScreen() {
  return (
    <SafeAreaView style={globalStyles.container}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 24 }}>
          <Ionicons name="camera-outline" size={24} color={colors.accent} />
          <Text style={styles.title}>Your Gear</Text>
        </View>

        {[
          { label: "Camera Body", value: defaultGear.camera, spec: defaultGear.cameraSpecs },
          { label: "Primary Lens", value: defaultGear.lensA, spec: defaultGear.lensASpecs },
          { label: "Secondary Lens", value: defaultGear.lensB, spec: defaultGear.lensBSpecs },
        ].map(({ label, value, spec }) => (
          <View key={label} style={[globalStyles.card, { marginBottom: 12 }]}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <Text style={styles.fieldValue}>{value}</Text>
            <Text style={styles.fieldSpec}>{spec}</Text>
          </View>
        ))}

        <View style={[globalStyles.card, { marginBottom: 24 }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, color: colors.text }}>Enable Secondary Camera</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                Use {defaultGear.secondary} for B-roll
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, defaultGear.secondaryEnabled && { backgroundColor: colors.accent }]}
            >
              <View style={[styles.toggleDot, defaultGear.secondaryEnabled && { left: 22 }]} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "600", color: colors.text },
  fieldLabel: { fontSize: 10, color: colors.textMuted, fontWeight: "600", letterSpacing: 0.5, marginBottom: 4 },
  fieldValue: { fontSize: 15, color: colors.text, fontWeight: "500" },
  fieldSpec: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
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
