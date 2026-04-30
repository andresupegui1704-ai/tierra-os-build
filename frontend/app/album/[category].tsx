import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Sparkles } from "lucide-react-native";
import { apiGet, COLORS, CATEGORY_META, PhotoAnalysis } from "../../src/lib/api";

type PhotoWithUrl = PhotoAnalysis & { url?: string | null };

const { width } = Dimensions.get("window");
const GAP = 8;
const COLS = 3;
const THUMB = (width - 48 - GAP * (COLS - 1)) / COLS;

export default function AlbumDetail() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const router = useRouter();
  const [photos, setPhotos] = useState<PhotoWithUrl[]>([]);
  const [loading, setLoading] = useState(true);

  const meta = CATEGORY_META[category as string] || CATEGORY_META.other;

  const load = useCallback(async () => {
    if (!category) return;
    try {
      const data = await apiGet<PhotoWithUrl[]>(`/photos/by-category/${category}`);
      setPhotos(data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          testID="album-back-btn"
        >
          <ChevronLeft color={COLORS.textPrimary} size={24} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.overline}>SMART ALBUM</Text>
          <Text style={styles.h1} testID="album-title">{meta.label}</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: meta.color + "20" }]}>
          <Text style={[styles.pillText, { color: meta.color }]}>{photos.length}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : photos.length === 0 ? (
          <View style={styles.empty}>
            <Sparkles color={COLORS.primary} size={24} strokeWidth={2.5} />
            <Text style={styles.emptyText}>No photos in this album yet.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {photos.map((p) => (
              <View key={p.photo_id} style={[styles.tile, { width: THUMB, height: THUMB }]} testID={`album-tile-${p.photo_id}`}>
                {p.url ? (
                  <Image source={{ uri: p.url }} style={styles.tileImg} resizeMode="cover" />
                ) : (
                  <View style={[styles.tileImg, styles.tilePlaceholder, { backgroundColor: meta.color + "25" }]}>
                    <Text style={[styles.tilePlaceholderText, { color: meta.color }]}>
                      {(p.label || "?").slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.surfaceSecondary,
  },
  overline: {
    fontSize: 11, fontWeight: "700", letterSpacing: 1.2,
    color: COLORS.primary,
  },
  h1: { fontSize: 22, fontWeight: "800", color: COLORS.textPrimary },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999 },
  pillText: { fontWeight: "700", fontSize: 14 },
  scroll: { paddingHorizontal: 24, paddingTop: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  tile: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: COLORS.surfaceSecondary,
  },
  tileImg: { width: "100%", height: "100%" },
  tilePlaceholder: { alignItems: "center", justifyContent: "center" },
  tilePlaceholderText: { fontSize: 28, fontWeight: "800" },
  empty: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },
});
