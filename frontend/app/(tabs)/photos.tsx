import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import {
  ImagePlus,
  Sparkles,
  Check,
  Trash2,
  RotateCcw,
  Zap,
  Copy,
  Wand2,
  ScanLine,
} from "lucide-react-native";
import { apiPost, apiGet, COLORS, PhotoAnalysis, DuplicateGroup, CATEGORY_META } from "../../src/lib/api";

type Photo = {
  id: string;
  uri: string;
  base64?: string;
};

const SCAN_STEPS = [
  "Reading EXIF metadata",
  "Hashing image content",
  "Analyzing visual features",
  "Categorizing with AI",
  "Clustering duplicates",
  "Ranking quality scores",
];

function ScanOverlay({ visible }: { visible: boolean }) {
  const [step, setStep] = useState(0);
  const pulse = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      setStep(0);
      progress.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    Animated.timing(progress, {
      toValue: 1,
      duration: SCAN_STEPS.length * 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    const i = setInterval(() => {
      setStep((s) => (s < SCAN_STEPS.length - 1 ? s + 1 : s));
    }, 700);
    return () => {
      clearInterval(i);
      loop.stop();
    };
  }, [visible, pulse, progress]);

  if (!visible) return null;

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent>
      <View style={overlayStyles.backdrop}>
        <View style={overlayStyles.card}>
          <Animated.View style={[overlayStyles.iconWrap, { transform: [{ scale }], opacity }]}>
            <ScanLine color={COLORS.primary} size={36} strokeWidth={2.5} />
          </Animated.View>
          <Text style={overlayStyles.title}>Scanning photos…</Text>
          <Text style={overlayStyles.step} testID="scan-step">{SCAN_STEPS[step]}</Text>
          <View style={overlayStyles.barTrack}>
            <Animated.View style={[overlayStyles.barFill, { width }]} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const overlayStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(2,6,23,0.55)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
  },
  iconWrap: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center", justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: "800", color: COLORS.textPrimary },
  step: { fontSize: 14, color: COLORS.textSecondary, marginTop: 6, marginBottom: 18, textAlign: "center" },
  barTrack: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.surfaceSecondary,
    overflow: "hidden",
  },
  barFill: { height: "100%", backgroundColor: COLORS.primary, borderRadius: 3 },
});

const buzz = (style: "light" | "medium" | "success" | "warn" = "light") => {
  if (Platform.OS === "web") return;
  try {
    if (style === "light") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else if (style === "medium") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else if (style === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {}
};

export default function Photos() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [analyses, setAnalyses] = useState<PhotoAnalysis[]>([]);
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [scanning, setScanning] = useState(false);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const pick = useCallback(async () => {
    buzz("light");
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "We need access to your photo library to scan for duplicates.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      base64: true,
      quality: 0.6,
    });
    if (res.canceled) return;
    const picked: Photo[] = res.assets.map((a, i) => ({
      id: a.assetId || `p-${Date.now()}-${i}`,
      uri: a.uri,
      base64: a.base64 || "",
    }));
    setPhotos(picked);
    setAnalyses([]);
    setGroups([]);
    setDeletedIds(new Set());
  }, []);

  const scan = useCallback(async () => {
    if (photos.length === 0) return;
    setScanning(true);
    buzz("light");
    try {
      const batch = photos
        .filter((p) => p.base64)
        .map((p) => ({ image_base64: p.base64!, photo_id: p.id }));
      const result = await apiPost<PhotoAnalysis[]>("/photos/batch-analyze", { photos: batch });
      setAnalyses(result);
      const grp = await apiPost<DuplicateGroup[]>("/photos/find-duplicates", { analyses: result });
      setGroups(grp);
      buzz("success");
    } catch (e) {
      console.warn("scan failed", e);
      buzz("warn");
      Alert.alert("Scan failed", "Could not analyze images. Please try again.");
    } finally {
      setScanning(false);
    }
  }, [photos]);

  const tryDemo = useCallback(async () => {
    setScanning(true);
    buzz("light");
    const started = Date.now();
    try {
      const data = await apiPost<{
        photos: { id: string; url: string }[];
        analyses: PhotoAnalysis[];
        groups: DuplicateGroup[];
      }>("/photos/demo-scan", {});
      // Let the scan animation play for at least 3.5s for a nicer feel.
      const elapsed = Date.now() - started;
      if (elapsed < 3500) {
        await new Promise((r) => setTimeout(r, 3500 - elapsed));
      }
      setPhotos(data.photos.map((p) => ({ id: p.id, uri: p.url })));
      setAnalyses(data.analyses);
      setGroups(data.groups);
      setDeletedIds(new Set());
      buzz("success");
    } catch (e) {
      console.warn(e);
      buzz("warn");
      Alert.alert("Demo failed", "Could not load demo scan.");
    } finally {
      setScanning(false);
    }
  }, []);

  const deleteGroup = useCallback(
    async (group: DuplicateGroup) => {
      buzz("medium");
      const toDelete = group.photo_ids.filter((id) => id !== group.recommended_keep);
      const newDeleted = new Set(deletedIds);
      toDelete.forEach((id) => newDeleted.add(id));
      setDeletedIds(newDeleted);
      try {
        await apiPost("/stats/record-photo-cleanup", {
          photos_deleted: toDelete.length,
          space_mb: group.space_mb,
        });
      } catch (e) {
        console.warn(e);
      }
    },
    [deletedIds]
  );

  const uriById = useCallback(
    (id: string) => photos.find((p) => p.id === id)?.uri,
    [photos]
  );

  const activeGroups = groups.filter((g) =>
    g.photo_ids.some((id) => !deletedIds.has(id))
  );
  const totalReclaimable = activeGroups.reduce((s, g) => {
    const alive = g.photo_ids.filter((id) => !deletedIds.has(id)).length;
    if (alive <= 1) return s;
    return s + g.space_mb;
  }, 0);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScanOverlay visible={scanning} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.overline}>PHOTO CLEANER</Text>
          <Text style={styles.h1}>Find duplicates</Text>
          <Text style={styles.sub}>Pick photos or try a demo scan to see how AI groups duplicates and similar shots.</Text>
        </View>

        {photos.length === 0 ? (
          <>
            <TouchableOpacity style={styles.pickerCard} onPress={pick} testID="photos-pick-btn">
              <View style={styles.pickerIcon}>
                <ImagePlus color={COLORS.primary} size={28} strokeWidth={2.5} />
              </View>
              <Text style={styles.pickerTitle}>Select photos</Text>
              <Text style={styles.pickerSub}>Up to 10 photos per scan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoBtn}
              onPress={tryDemo}
              disabled={scanning}
              testID="photos-demo-btn"
            >
              {scanning ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : (
                <>
                  <Wand2 color={COLORS.primary} size={18} strokeWidth={2.5} />
                  <Text style={styles.demoBtnText}>Try demo scan</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.thumbsRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {photos.map((p) => (
                <Image key={p.id} source={{ uri: p.uri }} style={styles.thumb} resizeMode="cover" />
              ))}
            </ScrollView>
          </View>
        )}

        {photos.length > 0 && analyses.length === 0 && (
          <TouchableOpacity
            style={[styles.primaryBtn, scanning && { opacity: 0.7 }]}
            onPress={scan}
            disabled={scanning}
            testID="photos-scan-btn"
          >
            {scanning ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Sparkles color="#FFFFFF" size={18} strokeWidth={2.5} />
                <Text style={styles.primaryBtnText}>Scan with AI</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {photos.length > 0 && (
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => {
              setPhotos([]);
              setAnalyses([]);
              setGroups([]);
              setDeletedIds(new Set());
            }}
            testID="photos-clear-btn"
          >
            <Text style={styles.secondaryBtnText}>Clear & start over</Text>
          </TouchableOpacity>
        )}

        {analyses.length > 0 && (
          <View style={styles.summaryCard} testID="photos-summary-card">
            <View style={styles.summaryRow}>
              <Copy color={COLORS.primary} size={18} strokeWidth={2.5} />
              <Text style={styles.summaryLabel}>GROUPS FOUND</Text>
            </View>
            <Text style={styles.summaryValue}>{activeGroups.length}</Text>
            <Text style={styles.summarySub}>
              ~{totalReclaimable.toFixed(1)} MB reclaimable across {analyses.length} photos scanned
            </Text>
          </View>
        )}

        {activeGroups.length === 0 && analyses.length > 0 && (
          <View style={styles.emptyCard}>
            <Zap color={COLORS.secondary} size={28} strokeWidth={2.5} />
            <Text style={styles.emptyTitle}>All clean!</Text>
            <Text style={styles.emptySub}>No duplicates or similar photos detected in this batch.</Text>
          </View>
        )}

        {activeGroups.map((g) => {
          const alive = g.photo_ids.filter((id) => !deletedIds.has(id));
          if (alive.length <= 1) return null;
          const meta = CATEGORY_META[g.category] || CATEGORY_META.other;
          return (
            <View key={g.id} style={styles.groupCard} testID={`photos-group-${g.id}`}>
              <View style={styles.groupHeader}>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: g.type === "exact" ? "#FEE2E2" : "#E6F0FA" },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: g.type === "exact" ? COLORS.destructive : COLORS.primary },
                    ]}
                  >
                    {g.type === "exact" ? "EXACT DUPLICATE" : "SIMILAR"}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: COLORS.surfaceSecondary }]}>
                  <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label.toUpperCase()}</Text>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
                {alive.map((id) => {
                  const uri = uriById(id);
                  const isKeep = id === g.recommended_keep;
                  return (
                    <View key={id} style={styles.groupPhotoWrap}>
                      {uri && <Image source={{ uri }} style={styles.groupPhoto} resizeMode="cover" />}
                      {isKeep && (
                        <View style={styles.keepBadge}>
                          <Check color="#FFFFFF" size={14} strokeWidth={3} />
                          <Text style={styles.keepBadgeText}>Keep</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
              <View style={styles.groupActions}>
                <Text style={styles.groupMeta}>~{g.space_mb.toFixed(1)} MB</Text>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => deleteGroup(g)}
                  testID={`photos-group-delete-${g.id}`}
                >
                  <Trash2 color={COLORS.destructive} size={16} strokeWidth={2.5} />
                  <Text style={styles.deleteBtnText}>Keep best & delete rest</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {deletedIds.size > 0 && (
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => {
              buzz("light");
              setDeletedIds(new Set());
            }}
            testID="photos-undo-btn"
          >
            <RotateCcw color={COLORS.textSecondary} size={16} strokeWidth={2.5} />
            <Text style={styles.secondaryBtnText}>Undo all</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const shadow = Platform.select({
  web: { boxShadow: "0 8px 16px rgba(0,91,181,0.25)" as any },
  default: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingHorizontal: 24, paddingTop: 8 },
  header: { marginBottom: 20 },
  overline: {
    fontSize: 12, fontWeight: "700", letterSpacing: 1.4, color: COLORS.primary, marginBottom: 6,
  },
  h1: { fontSize: 30, fontWeight: "800", color: COLORS.textPrimary, letterSpacing: 0.2 },
  sub: { fontSize: 15, color: COLORS.textSecondary, marginTop: 4, lineHeight: 22 },
  pickerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.surfaceSecondary,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    marginBottom: 12,
  },
  pickerIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primaryLight,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  pickerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.textPrimary },
  pickerSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  demoBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 14,
    borderRadius: 9999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 20,
  },
  demoBtnText: { color: COLORS.primary, fontWeight: "700", fontSize: 14 },
  thumbsRow: { marginBottom: 16 },
  thumb: { width: 76, height: 76, borderRadius: 14, backgroundColor: COLORS.surfaceSecondary },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 9999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    ...shadow,
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
  secondaryBtn: {
    backgroundColor: COLORS.surfaceSecondary,
    paddingVertical: 14,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
  },
  secondaryBtnText: { color: COLORS.textSecondary, fontWeight: "600", fontSize: 14 },
  summaryCard: {
    marginTop: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.surfaceSecondary,
  },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  summaryLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2, color: COLORS.primary },
  summaryValue: { fontSize: 42, fontWeight: "800", color: COLORS.textPrimary, marginTop: 6 },
  summarySub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  emptyCard: {
    marginTop: 24,
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 20,
    padding: 28,
    gap: 6,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: COLORS.textPrimary, marginTop: 4 },
  emptySub: { fontSize: 13, color: COLORS.textSecondary, textAlign: "center" },
  groupCard: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceSecondary,
  },
  groupHeader: { flexDirection: "row", gap: 8, marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  badgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  groupPhotoWrap: { position: "relative" },
  groupPhoto: { width: 120, height: 120, borderRadius: 14, backgroundColor: COLORS.surfaceSecondary },
  keepBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  keepBadgeText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
  groupActions: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  groupMeta: { fontSize: 13, fontWeight: "600", color: COLORS.textSecondary },
  deleteBtn: {
    backgroundColor: COLORS.destructiveLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 9999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  deleteBtnText: { color: COLORS.destructive, fontWeight: "700", fontSize: 13 },
});
