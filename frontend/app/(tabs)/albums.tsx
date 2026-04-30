import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Layers, Sparkles } from "lucide-react-native";
import { apiGet, COLORS, CATEGORY_META } from "../../src/lib/api";

type Album = {
  category: string;
  count: number;
  photo_ids: string[];
};

export default function Albums() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<Album[]>("/photos/albums");
      setAlbums(data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.overline}>SMART ALBUMS</Text>
          <Text style={styles.h1}>AI folders</Text>
          <Text style={styles.sub}>
            Auto-grouped by content. Scan photos in the Photos tab to populate albums.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : albums.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Layers color={COLORS.primary} size={32} strokeWidth={2.5} />
            </View>
            <Text style={styles.emptyTitle}>No albums yet</Text>
            <Text style={styles.emptySub}>
              Go to Photos tab, pick images and run an AI scan. Categorized albums will appear here automatically.
            </Text>
          </View>
        ) : (
          <View style={styles.grid} testID="albums-grid">
            {albums.map((a) => {
              const meta = CATEGORY_META[a.category] || CATEGORY_META.other;
              return (
                <View key={a.category} style={styles.albumCard} testID={`album-${a.category}`}>
                  <View style={[styles.albumImage, { backgroundColor: meta.color + "20" }]}>
                    {meta.image ? (
                      <Image source={{ uri: meta.image }} style={styles.albumBg} />
                    ) : null}
                    <View style={styles.albumOverlay}>
                      <Sparkles color="#FFFFFF" size={18} strokeWidth={2.5} />
                    </View>
                  </View>
                  <Text style={styles.albumLabel}>{meta.label}</Text>
                  <Text style={styles.albumCount}>{a.count} photo{a.count === 1 ? "" : "s"}</Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingHorizontal: 24, paddingTop: 8 },
  header: { marginBottom: 20 },
  overline: {
    fontSize: 12, fontWeight: "700", letterSpacing: 1.4, color: COLORS.primary, marginBottom: 6,
  },
  h1: { fontSize: 30, fontWeight: "800", color: COLORS.textPrimary, letterSpacing: 0.2 },
  sub: { fontSize: 15, color: COLORS.textSecondary, marginTop: 4, lineHeight: 22 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  albumCard: {
    width: "48%",
  },
  albumImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 16,
    overflow: "hidden",
    justifyContent: "flex-end",
    marginBottom: 8,
  },
  albumBg: { position: "absolute", width: "100%", height: "100%", resizeMode: "cover", opacity: 0.9 },
  albumOverlay: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  albumLabel: { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary },
  albumCount: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  empty: {
    alignItems: "center",
    marginTop: 40,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center", justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: COLORS.textPrimary },
  emptySub: { fontSize: 14, color: COLORS.textSecondary, textAlign: "center", marginTop: 6, lineHeight: 22 },
});
