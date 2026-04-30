import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Swipeable, RectButton } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import {
  Mail,
  Trash2,
  Check,
  Flame,
  Tag,
  Newspaper,
  Users,
  Shield,
  RotateCcw,
} from "lucide-react-native";
import {
  apiGet,
  apiPost,
  COLORS,
  EmailItem,
  EMAIL_CATEGORY_META,
} from "../../src/lib/api";

const CATEGORY_ORDER: EmailItem["category"][] = [
  "spam",
  "promotions",
  "newsletters",
  "social",
  "useful",
];

const CATEGORY_ICON: Record<EmailItem["category"], React.ReactNode> = {
  spam: <Flame color="#EF4444" size={18} strokeWidth={2.5} />,
  promotions: <Tag color="#F59E0B" size={18} strokeWidth={2.5} />,
  newsletters: <Newspaper color="#0EA5E9" size={18} strokeWidth={2.5} />,
  social: <Users color="#8B5CF6" size={18} strokeWidth={2.5} />,
  useful: <Shield color="#10B981" size={18} strokeWidth={2.5} />,
};

export default function Emails() {
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const buzz = () => {
    if (Platform.OS !== "web") {
      try { Haptics.selectionAsync(); } catch {}
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<EmailItem[]>("/emails/scan");
      setEmails(data);
      setSelected(new Set());
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const map: Record<string, EmailItem[]> = {};
    for (const c of CATEGORY_ORDER) map[c] = [];
    emails.forEach((e) => (map[e.category] = [...(map[e.category] || []), e]));
    return map;
  }, [emails]);

  const toggle = (id: string) => {
    buzz();
    const n = new Set(selected);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setSelected(n);
  };

  const selectCategory = (cat: EmailItem["category"]) => {
    buzz();
    const n = new Set(selected);
    const ids = grouped[cat].map((e) => e.id);
    const allIn = ids.every((i) => n.has(i));
    if (allIn) ids.forEach((i) => n.delete(i));
    else ids.forEach((i) => n.add(i));
    setSelected(n);
  };

  const selectAllJunk = () => {
    buzz();
    const n = new Set<string>();
    (["spam", "promotions", "newsletters", "social"] as const).forEach((c) => {
      grouped[c].forEach((e) => n.add(e.id));
    });
    setSelected(n);
  };

  const confirmDelete = () => {
    if (selected.size === 0) return;
    if (typeof window !== "undefined" && typeof (window as any).confirm === "function") {
      const ok = (window as any).confirm(
        `Move ${selected.size} email${selected.size === 1 ? "" : "s"} to trash?`
      );
      if (ok) doDelete();
      return;
    }
    Alert.alert(
      "Delete emails",
      `Move ${selected.size} email${selected.size === 1 ? "" : "s"} to trash?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: doDelete,
        },
      ]
    );
  };

  const doDelete = useCallback(async () => {
    setBusy(true);
    try {
      await apiPost("/emails/delete", {
        user_id: "demo",
        email_ids: Array.from(selected),
      });
      await load();
    } catch (e) {
      Alert.alert("Error", "Could not delete emails.");
    } finally {
      setBusy(false);
    }
  }, [selected, load]);

  const reset = useCallback(async () => {
    setBusy(true);
    try {
      await apiPost("/emails/reset", { user_id: "demo" });
      await load();
    } catch {}
    finally {
      setBusy(false);
    }
  }, [load]);

  const totalJunk =
    grouped.spam.length + grouped.promotions.length +
    grouped.newsletters.length + grouped.social.length;
  const totalSizeKB = emails
    .filter((e) => selected.has(e.id))
    .reduce((s, e) => s + e.size_kb, 0);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.overline}>EMAIL CLEANER</Text>
          <Text style={styles.h1}>Declutter inbox</Text>
          <Text style={styles.sub}>
            Demo inbox loaded. Connect Gmail in Settings to clean your real emails.
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryLabel}>JUNK DETECTED</Text>
            <Text style={styles.summaryValue} testID="emails-junk-count">{totalJunk}</Text>
            <Text style={styles.summarySub}>emails can be cleaned</Text>
          </View>
          <TouchableOpacity style={styles.selectAllBtn} onPress={selectAllJunk} testID="emails-select-all-junk">
            <Text style={styles.selectAllText}>Select all junk</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : emails.length === 0 ? (
          <View style={styles.empty}>
            <Check color={COLORS.secondary} size={32} strokeWidth={2.5} />
            <Text style={styles.emptyTitle}>Inbox zero!</Text>
            <Text style={styles.emptySub}>All junk emails have been cleaned.</Text>
            <TouchableOpacity style={styles.resetBtn} onPress={reset} testID="emails-reset-btn">
              <RotateCcw color={COLORS.textSecondary} size={14} strokeWidth={2.5} />
              <Text style={styles.resetBtnText}>Restore demo inbox</Text>
            </TouchableOpacity>
          </View>
        ) : (
          CATEGORY_ORDER.map((cat) => {
            const items = grouped[cat] || [];
            if (items.length === 0) return null;
            const meta = EMAIL_CATEGORY_META[cat];
            const allSelected = items.every((e) => selected.has(e.id));
            return (
              <View key={cat} style={styles.section}>
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() => selectCategory(cat)}
                  testID={`email-section-${cat}`}
                >
                  <View style={styles.sectionLeft}>
                    {CATEGORY_ICON[cat]}
                    <Text style={styles.sectionTitle}>{meta.label}</Text>
                    <View style={[styles.countPill, { backgroundColor: meta.color + "20" }]}>
                      <Text style={[styles.countPillText, { color: meta.color }]}>{items.length}</Text>
                    </View>
                  </View>
                  <View style={[styles.checkbox, allSelected && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}>
                    {allSelected && <Check color="#FFFFFF" size={14} strokeWidth={3} />}
                  </View>
                </TouchableOpacity>
                {items.map((e) => {
                  const isSelected = selected.has(e.id);
                  const renderRight = (progress: Animated.AnimatedInterpolation<number>) => {
                    const scale = progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.7, 1],
                      extrapolate: "clamp",
                    });
                    return (
                      <View style={styles.swipeAction}>
                        <Animated.View style={{ transform: [{ scale }], alignItems: "center" }}>
                          <Text style={styles.swipeActionText}>Delete</Text>
                        </Animated.View>
                      </View>
                    );
                  };
                  const onSwipeDelete = async () => {
                    buzz();
                    try {
                      await apiPost("/emails/delete", { user_id: "demo", email_ids: [e.id] });
                      setEmails((prev) => prev.filter((x) => x.id !== e.id));
                      setSelected((prev) => {
                        const n = new Set(prev);
                        n.delete(e.id);
                        return n;
                      });
                    } catch {}
                  };
                  return (
                    <Swipeable
                      key={e.id}
                      renderRightActions={renderRight}
                      onSwipeableOpen={onSwipeDelete}
                      overshootRight={false}
                      friction={2}
                    >
                      <TouchableOpacity
                        style={[styles.emailRow, isSelected && styles.emailRowSelected]}
                        onPress={() => toggle(e.id)}
                        testID={`email-row-${e.id}`}
                      >
                        <View style={[styles.checkbox, isSelected && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}>
                          {isSelected && <Check color="#FFFFFF" size={14} strokeWidth={3} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.emailTopLine}>
                            <Text style={styles.sender} numberOfLines={1}>{e.sender}</Text>
                            <Text style={styles.size}>{e.size_kb} KB</Text>
                          </View>
                          <Text style={styles.subject} numberOfLines={1}>{e.subject}</Text>
                          <Text style={styles.preview} numberOfLines={1}>{e.preview}</Text>
                        </View>
                      </TouchableOpacity>
                    </Swipeable>
                  );
                })}
              </View>
            );
          })
        )}

        <View style={{ height: 160 }} />
      </ScrollView>

      {selected.size > 0 && (
        <View style={styles.fab} testID="emails-fab">
          <View style={{ flex: 1 }}>
            <Text style={styles.fabCount}>{selected.size} selected</Text>
            <Text style={styles.fabSub}>{(totalSizeKB / 1024).toFixed(2)} MB to reclaim</Text>
          </View>
          <TouchableOpacity
            style={[styles.fabBtn, busy && { opacity: 0.6 }]}
            onPress={confirmDelete}
            disabled={busy}
            testID="emails-delete-btn"
          >
            {busy ? <ActivityIndicator color="#FFFFFF" /> : (
              <>
                <Trash2 color="#FFFFFF" size={18} strokeWidth={2.5} />
                <Text style={styles.fabBtnText}>Delete</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingHorizontal: 24, paddingTop: 8 },
  header: { marginBottom: 16 },
  overline: {
    fontSize: 12, fontWeight: "700", letterSpacing: 1.4, color: COLORS.primary, marginBottom: 6,
  },
  h1: { fontSize: 30, fontWeight: "800", color: COLORS.textPrimary, letterSpacing: 0.2 },
  sub: { fontSize: 15, color: COLORS.textSecondary, marginTop: 4, lineHeight: 22 },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.surfaceSecondary,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },
  summaryLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2, color: COLORS.primary },
  summaryValue: { fontSize: 36, fontWeight: "800", color: COLORS.textPrimary, marginTop: 4 },
  summarySub: { fontSize: 12, color: COLORS.textSecondary },
  selectAllBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  selectAllText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  section: { marginBottom: 8 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  sectionLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: COLORS.textPrimary },
  countPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 },
  countPillText: { fontSize: 11, fontWeight: "700" },
  checkbox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceSecondary,
    marginBottom: 8,
  },
  emailRowSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  emailTopLine: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  sender: { flex: 1, fontSize: 14, fontWeight: "700", color: COLORS.textPrimary },
  size: { fontSize: 11, color: COLORS.textTertiary, fontWeight: "600" },
  subject: { fontSize: 13, fontWeight: "600", color: COLORS.textPrimary, marginTop: 2 },
  preview: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  fab: {
    position: "absolute",
    bottom: 96,
    left: 24,
    right: 24,
    backgroundColor: COLORS.textPrimary,
    padding: 14,
    borderRadius: 9999,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  fabCount: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  fabSub: { color: "#94A3B8", fontSize: 12, marginTop: 2 },
  fabBtn: {
    backgroundColor: COLORS.destructive,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 9999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fabBtnText: { color: "#FFFFFF", fontWeight: "700" },
  empty: {
    alignItems: "center",
    marginTop: 20,
    gap: 8,
    padding: 24,
    backgroundColor: "#ECFDF5",
    borderRadius: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: COLORS.textPrimary },
  emptySub: { fontSize: 14, color: COLORS.textSecondary, textAlign: "center" },
  resetBtn: {
    marginTop: 8,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 9999,
    backgroundColor: COLORS.surfaceSecondary,
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  resetBtnText: { color: COLORS.textSecondary, fontWeight: "600", fontSize: 13 },
  swipeAction: {
    backgroundColor: COLORS.destructive,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: 24,
    marginBottom: 8,
    borderRadius: 14,
  },
  swipeActionText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
});
