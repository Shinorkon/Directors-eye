import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, globalStyles } from "../src/theme";
import { samplePrompts } from "../src/data/demo";
import { generateScriptment, generateStoryboardFrames, saveProject } from "../src/services/api";

export default function HomeScreen() {
  const [concept, setConcept] = useState("");
  const [generating, setGenerating] = useState(false);
  const router = useRouter();

  const handleGenerate = async () => {
    if (!concept.trim()) return;
    setGenerating(true);

    try {
      const scriptment = await generateScriptment(concept);
      const allBeats = scriptment.acts.flatMap((a: any) => a.beats);
      let frames: string[] = [];

      if (allBeats.length > 0) {
        try {
          const result = await generateStoryboardFrames(allBeats);
          frames = result.frames;
        } catch {
          // continue without frames
        }
      }

      allBeats.forEach((beat: any, i: number) => {
        if (frames[i]) beat.storyboardFrame = `data:image/png;base64,${frames[i]}`;
      });

      saveProject({ scriptment, hero_frame: frames[0] ? `data:image/png;base64,${frames[0]}` : "" })
        .catch(() => {});

      router.push({
        pathname: "/scriptment",
        params: { scriptment: JSON.stringify(scriptment) },
      });
    } catch (err: any) {
      Alert.alert("Generation Failed", err.message || "Check your API key configuration.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>YOUR PERSONAL FILM DIRECTOR</Text>
          <Text style={styles.headline}>Turn sparks into stories.</Text>
          <Text style={styles.subhead}>
            Describe your cinematic idea. Director's Eye will plan the shots, compose
            the frames, and build your shoot list.
          </Text>
        </View>

        <View style={styles.inputSection}>
          <TextInput
            style={styles.input}
            placeholder="A 60-second film about solitude at dawn. A fisherman prepares his boat..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={5}
            value={concept}
            onChangeText={setConcept}
            editable={!generating}
          />

          <TouchableOpacity
            style={[globalStyles.button, (!concept.trim() || generating) && { opacity: 0.3 }]}
            onPress={handleGenerate}
            disabled={!concept.trim() || generating}
          >
            {generating ? (
              <ActivityIndicator color={colors.bg} />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="sparkles" size={18} color={colors.bg} />
                <Text style={globalStyles.buttonText}>Generate Scriptment</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.prompts}>
          <Text style={[globalStyles.caption, { marginBottom: 12, textAlign: "center" }]}>
            QUICK START
          </Text>
          <View style={styles.promptRow}>
            {samplePrompts.map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setConcept(p)}
                style={styles.promptChip}
              >
                <Text style={styles.promptText}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 40,
  },
  hero: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
    alignItems: "center",
  },
  eyebrow: {
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: 16,
    fontWeight: "600",
  },
  headline: {
    fontSize: 36,
    color: colors.text,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 42,
    marginBottom: 12,
  },
  subhead: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 360,
  },
  inputSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    color: colors.text,
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  prompts: {
    paddingHorizontal: 24,
  },
  promptRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  promptChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
  },
  promptText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
