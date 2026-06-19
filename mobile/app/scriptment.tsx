import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Modal, ActivityIndicator, Dimensions, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { colors, globalStyles } from "../src/theme";
import { sampleScriptment } from "../src/data/demo";
import BeatCard from "../src/components/BeatCard";
import StoryboardFrame from "../src/components/StoryboardFrame";
import DirectorNote from "../src/components/DirectorNote";
import { generateStoryboardFrames, getProject } from "../src/services/api";

const { width } = Dimensions.get("window");

export default function ScriptmentScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [scriptment, setScriptment] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [activeBeat, setActiveBeat] = useState(1);
  const [lightboxBeat, setLightboxBeat] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const projectId = params.projectId as string;
    const passedStr = params.scriptment as string;

    if (projectId) {
      getProject(projectId).then((data) => {
        setScriptment(data?.scriptment || sampleScriptment);
        setTitle(data?.scriptment?.title || sampleScriptment.title);
        setLoading(false);
      }).catch(() => {
        setScriptment(sampleScriptment);
        setTitle(sampleScriptment.title);
        setLoading(false);
      });
    } else if (passedStr) {
      try {
        const parsed = JSON.parse(passedStr);
        setScriptment(parsed);
        setTitle(parsed.title);
      } catch {
        setScriptment(sampleScriptment);
        setTitle(sampleScriptment.title);
      }
      setLoading(false);
    } else {
      setScriptment(sampleScriptment);
      setTitle(sampleScriptment.title);
      setLoading(false);
    }
  }, []);

  const allBeats = scriptment?.acts?.flatMap((a: any) => a.beats) || [];

  if (loading) {
    return (
      <SafeAreaView style={[globalStyles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={globalStyles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <TextInput
          value={title}
          onChangeText={setTitle}
          style={styles.titleInput}
        />
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/shoot-list",
              params: { scriptment: JSON.stringify({ ...scriptment, title }) },
            })
          }
          style={styles.shootBtn}
        >
          <Ionicons name="list" size={18} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16 }}>
        {/* Beat timeline */}
        {scriptment?.acts?.map((act: any) => (
          <View key={act.actNumber} style={{ marginBottom: 16 }}>
            <Text style={styles.actTitle}>
              Act {act.actNumber} — {act.title}
            </Text>
            {act.beats.map((beat: any, i: number) => (
              <BeatCard
                key={beat.beatNumber}
                beat={beat}
                isActive={activeBeat === beat.beatNumber}
                onPress={() => setActiveBeat(beat.beatNumber)}
                index={i}
              />
            ))}
          </View>
        ))}

        {/* Storyboard grid */}
        <View style={styles.grid}>
          {allBeats.map((beat: any, i: number) => (
            <StoryboardFrame
              key={beat.beatNumber}
              imageUrl={beat.storyboardFrame}
              beatNumber={beat.beatNumber}
              shotType={beat.shotType}
              description={beat.description}
              onPress={() => setLightboxBeat(beat)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Lightbox Modal */}
      <Modal visible={!!lightboxBeat} transparent animationType="fade">
        <TouchableOpacity
          style={styles.lightbox}
          activeOpacity={1}
          onPress={() => setLightboxBeat(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.lightboxContent}>
            <View style={styles.lightboxFrame}>
              {lightboxBeat?.storyboardFrame ? (
                <Image
                  source={{ uri: lightboxBeat.storyboardFrame }}
                  style={{ width: "100%", height: 200 }}
                  resizeMode="contain"
                />
              ) : (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>No frame</Text>
                </View>
              )}
            </View>
            <Text style={styles.lightboxTitle}>{lightboxBeat?.description}</Text>
            <Text style={styles.lightboxSub}>{lightboxBeat?.motivation}</Text>
            <DirectorNote
              text={`Shot ${lightboxBeat?.beatNumber}. ${lightboxBeat?.description}`}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  titleInput: {
    flex: 1,
    fontSize: 17,
    color: colors.text,
    fontWeight: "600",
  },
  shootBtn: {
    padding: 8,
  },
  actTitle: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  grid: {
    marginTop: 8,
  },
  lightbox: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    padding: 24,
  },
  lightboxContent: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: "hidden",
  },
  lightboxFrame: {
    aspectRatio: 2.39 / 1,
    backgroundColor: colors.surfaceHover,
  },
  lightboxTitle: {
    fontSize: 14,
    color: colors.text,
    padding: 16,
    paddingBottom: 4,
  },
  lightboxSub: {
    fontSize: 12,
    color: colors.textSecondary,
    paddingHorizontal: 16,
    paddingBottom: 12,
    fontStyle: "italic",
  },
});
