import React from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, globalStyles } from "../src/theme";
import { useProjects } from "../src/hooks/use-projects";

export default function ArchiveScreen() {
  const router = useRouter();
  const { projects, loading, remove } = useProjects();

  if (loading) {
    return (
      <SafeAreaView style={[globalStyles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Projects</Text>
        <Text style={styles.count}>{projects.length}</Text>
      </View>

      {projects.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
          <Ionicons name="film-outline" size={48} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontSize: 20, marginTop: 12 }}>No projects yet</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 8, textAlign: "center" }}>
            Your first cinematic story starts with a single idea.
          </Text>
          <TouchableOpacity
            style={[globalStyles.button, { marginTop: 24, paddingHorizontal: 24 }]}
            onPress={() => router.push("/")}
          >
            <Text style={globalStyles.buttonText}>Create First Project</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({ pathname: "/scriptment", params: { projectId: item.id } })}
            >
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                  <Text style={styles.cardMeta}>{new Date(item.created_at).toLocaleDateString()}</Text>
                  <Text style={styles.cardMeta}>{item.shot_count} shots</Text>
                  {item.completed_shots > 0 && (
                    <Text style={[styles.cardMeta, { color: colors.success }]}>
                      {item.completed_shots}/{item.shot_count}
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity onPress={() => remove(item.id)} style={{ padding: 8 }}>
                <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 8,
  },
  title: { fontSize: 28, fontWeight: "600", color: colors.text },
  count: { fontSize: 10, color: colors.accent, backgroundColor: "rgba(200,149,108,0.1)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontWeight: "600" },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, color: colors.text, fontWeight: "500" },
  cardMeta: { fontSize: 11, color: colors.textMuted },
});
