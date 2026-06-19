import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { colors, globalStyles } from "../src/theme";
import { defaultGear } from "../src/data/demo";
import { generateShootList } from "../src/services/api";

export default function ShootListScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const scriptment = params.scriptment ? JSON.parse(params.scriptment as string) : null;
  const [shots, setShots] = useState<any[]>([]);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (scriptment) {
      generateShootList(scriptment)
        .then((result) => setShots(result.shots || []))
        .catch(() => setShots([]))
        .finally(() => setLoading(false));
    }
  }, []);

  const toggleShot = (num: number) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.has(num) ? next.delete(num) : next.add(num);
      return next;
    });
  };

  if (!scriptment) {
    return (
      <SafeAreaView style={[globalStyles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: colors.textSecondary, marginBottom: 16 }}>No project loaded.</Text>
        <TouchableOpacity style={globalStyles.button} onPress={() => router.back()}>
          <Text style={globalStyles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Shoot List</Text>
          <Text style={styles.subtitle}>{scriptment.title}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {shots.map((shot: any) => {
            const done = completed.has(shot.beatNumber);
            const cs = shot.cameraSettings;
            return (
              <View key={shot.beatNumber} style={[styles.shotCard, done && { borderColor: "rgba(123,174,127,0.3)" }]}>
                <View style={styles.shotHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={styles.shotNumber}>SHOT {shot.beatNumber}</Text>
                    <Text style={styles.shotType}>{shot.shotType}</Text>
                  </View>
                  <TouchableOpacity onPress={() => toggleShot(shot.beatNumber)}>
                    <Ionicons
                      name={done ? "checkmark-circle" : "checkmark-circle-outline"}
                      size={22}
                      color={done ? colors.success : colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.description, done && { opacity: 0.4 }]}>{shot.description}</Text>
                {cs && (
                  <View style={styles.settingsGrid}>
                    {[
                      { label: "Lens", value: cs.lens },
                      { label: "Aperture", value: cs.aperture },
                      { label: "Shutter", value: cs.shutter },
                      { label: "ISO", value: cs.iso },
                      { label: "WB", value: cs.whiteBalance },
                      { label: "Profile", value: cs.pictureProfile },
                    ].map(({ label, value }) => (
                      <View key={label} style={styles.setting}>
                        <Text style={styles.settingLabel}>{label}</Text>
                        <Text style={styles.settingValue}>{value}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {cs?.composition && (
                  <Text style={styles.composition}>{cs.composition}</Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 22, fontWeight: "600", color: colors.text },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  shotCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  shotHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  shotNumber: { fontSize: 10, color: colors.accent, fontWeight: "600" },
  shotType: { fontSize: 10, color: colors.textSecondary, backgroundColor: "rgba(255,255,255,0.04)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  description: { fontSize: 13, color: colors.text, marginBottom: 12, lineHeight: 18 },
  settingsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  setting: { minWidth: "30%" },
  settingLabel: { fontSize: 9, color: colors.textMuted, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  settingValue: { fontSize: 12, color: colors.text },
  composition: { fontSize: 11, color: colors.textSecondary, fontStyle: "italic", marginTop: 4 },
});
