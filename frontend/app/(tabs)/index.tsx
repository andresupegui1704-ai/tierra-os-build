import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import {
  HardDrive,
  Images,
  Layers,
  Mail,
  TrendingUp,
  Sparkles,
  ChevronRight,
} from "lucide-react-native";
import { apiGet, COLORS, UserStats } from "../../src/lib/api";

export default function Home() {
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await apiGet<UserStats>("/stats");
      setStats(s);
    } catch (e) {
      console.warn("stats load failed", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  const spaceSaved = stats?.space_saved_mb ?? 0;
  const photosCleaned = stats?.photos_cleaned ?? 0;
  const emailsCleaned = stats?.emails_cleaned ?? 0;

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
          <View>
            <Text style={styles.overline} testID="home-overline">CLEANMATE</Text>
            <Text style={styles.hello}>Good to see you.</Text>
            <Text style={styles.subhello}>Let’s clean up your digital life.</Text>
          </View>
          <View style={styles.sparkleCircle}>
            <Sparkles color={COLORS.primary} size={20} strokeWidth={2.5} />
          </View>
        </View>

        {/* Big stat card */}
        <View style={styles.heroCard} testID="home-hero-card">
          <View style={styles.heroRow}>
            <HardDrive color={COLORS.primary} size={22} strokeWidth={2.5} />
            <Text style={styles.heroLabel}>SPACE SAVED</Text>
          </View>
          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 8 }} />
          ) : (
            <Text style={styles.heroValue} testID="home-space-saved">
              {spaceSaved.toFixed(1)} <Text style={styles.heroUnit}>MB</Text>
            </Text>
          )}
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue} testID="home-photos-cleaned">{photosCleaned}</Text>
              <Text style={styles.heroStatLabel}>Photos cleaned</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue} testID="home-emails-cleaned">{emailsCleaned}</Text>
              <Text style={styles.heroStatLabel}>Emails cleaned</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <ActionCard
          testID="home-clean-photos-card"
          icon={<Images color="#FFFFFF" size={22} strokeWidth={2.5} />}
          iconBg={COLORS.primary}
          title="Clean Photos"
          subtitle="Find duplicates & similar photos"
          onPress={() => router.push("/(tabs)/photos")}
        />
        <ActionCard
          testID="home-smart-albums-card"
          icon={<Layers color="#FFFFFF" size={22} strokeWidth={2.5} />}
          iconBg="#6366F1"
          title="Smart Albums"
          subtitle="AI-organized folders by category"
          onPress={() => router.push("/(tabs)/albums")}
        />
        <ActionCard
          testID="home-clean-inbox-card"
          icon={<Mail color="#FFFFFF" size={22} strokeWidth={2.5} />}
          iconBg={COLORS.secondary}
          title="Clean Inbox"
          subtitle="Delete spam, promos & newsletters"
          onPress={() => router.push("/(tabs)/emails")}
        />

        <View style={styles.tipCard}>
          <TrendingUp color={COLORS.secondary} size={20} strokeWidth={2.5} />
          <View style={{ flex: 1 }}>
            <Text style={styles.tipTitle}>Tip: Run a weekly cleanup</Text>
            <Text style={styles.tipText}>
              Keeping your gallery and inbox tidy every week saves hours later.
            </Text>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionCard({
  icon,
  iconBg,
  title,
  subtitle,
  onPress,
  testID,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <TouchableOpacity
      style={styles.actionCard}
      onPress={onPress}
      activeOpacity={0.85}
      testID={testID}
    >
      <View style={[styles.actionIcon, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <ChevronRight color={COLORS.textTertiary} size={22} strokeWidth={2.5} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingHorizontal: 24, paddingTop: 8 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  overline: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    color: COLORS.primary,
    marginBottom: 6,
  },
  hello: { fontSize: 30, fontWeight: "800", color: COLORS.textPrimary, letterSpacing: 0.2 },
  subhello: { fontSize: 15, color: COLORS.textSecondary, marginTop: 2 },
  sparkleCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.surfaceSecondary,
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 2,
    marginBottom: 32,
  },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  heroLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: COLORS.primary,
  },
  heroValue: {
    fontSize: 52,
    fontWeight: "800",
    color: COLORS.textPrimary,
    letterSpacing: -1,
    marginTop: 8,
  },
  heroUnit: { fontSize: 22, fontWeight: "700", color: COLORS.textSecondary },
  heroStats: {
    flexDirection: "row",
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceSecondary,
  },
  heroStat: { flex: 1 },
  heroStatValue: { fontSize: 22, fontWeight: "700", color: COLORS.textPrimary },
  heroStatLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  heroDivider: { width: 1, backgroundColor: COLORS.surfaceSecondary, marginHorizontal: 12 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  actionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.surfaceSecondary,
    marginBottom: 12,
    gap: 14,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: { fontSize: 16, fontWeight: "700", color: COLORS.textPrimary },
  actionSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  tipCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 20,
  },
  tipTitle: { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary },
  tipText: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2, lineHeight: 18 },
});
