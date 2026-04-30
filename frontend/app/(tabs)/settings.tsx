import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Mail,
  Shield,
  Trash2,
  Info,
  ChevronRight,
  Github,
  HelpCircle,
} from "lucide-react-native";
import { apiGet, apiPost, COLORS } from "../../src/lib/api";

type GmailStatus = {
  connected: boolean;
  email: string | null;
  demo_mode: boolean;
  message: string;
};

export default function Settings() {
  const [gmail, setGmail] = useState<GmailStatus | null>(null);
  const [haptics, setHaptics] = useState(true);
  const [autoScan, setAutoScan] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await apiGet<GmailStatus>("/gmail/status");
      setGmail(s);
    } catch (e) {
      console.warn(e);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const connectGmail = () => {
    Alert.alert(
      "Connect Gmail",
      "To connect your real Gmail inbox, we need Google OAuth credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET) from Google Cloud Console. For now, a realistic demo inbox is loaded.",
      [{ text: "OK" }]
    );
  };

  const resetAll = () => {
    Alert.alert(
      "Reset all stats",
      "This will clear cleanup history and restore demo inbox. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              await apiPost("/stats/reset", { user_id: "demo" });
              await apiPost("/emails/reset", { user_id: "demo" });
              Alert.alert("Done", "All data reset.");
            } catch {
              Alert.alert("Error", "Could not reset.");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.overline}>SETTINGS</Text>
          <Text style={styles.h1}>Preferences</Text>
        </View>

        <Text style={styles.sectionLabel}>Connected Accounts</Text>
        <TouchableOpacity
          style={styles.row}
          onPress={connectGmail}
          testID="settings-gmail-row"
        >
          <View style={[styles.rowIcon, { backgroundColor: COLORS.destructiveLight }]}>
            <Mail color={COLORS.destructive} size={20} strokeWidth={2.5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Gmail</Text>
            <Text style={styles.rowSub}>
              {gmail?.connected ? `Connected · ${gmail.email}` : "Demo mode — Tap to learn more"}
            </Text>
          </View>
          <ChevronRight color={COLORS.textTertiary} size={20} strokeWidth={2.5} />
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Preferences</Text>
        <View style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: COLORS.primaryLight }]}>
            <Shield color={COLORS.primary} size={20} strokeWidth={2.5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Haptic Feedback</Text>
            <Text style={styles.rowSub}>Vibrate on cleanup actions</Text>
          </View>
          <Switch
            value={haptics}
            onValueChange={setHaptics}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor="#FFFFFF"
            testID="settings-haptics-switch"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: "#FEF3C7" }]}>
            <Info color="#D97706" size={20} strokeWidth={2.5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Auto-scan weekly</Text>
            <Text style={styles.rowSub}>Remind me to clean every week</Text>
          </View>
          <Switch
            value={autoScan}
            onValueChange={setAutoScan}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor="#FFFFFF"
            testID="settings-autoscan-switch"
          />
        </View>

        <Text style={styles.sectionLabel}>Data</Text>
        <TouchableOpacity style={styles.row} onPress={resetAll} testID="settings-reset-btn">
          <View style={[styles.rowIcon, { backgroundColor: COLORS.destructiveLight }]}>
            <Trash2 color={COLORS.destructive} size={20} strokeWidth={2.5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: COLORS.destructive }]}>Reset all data</Text>
            <Text style={styles.rowSub}>Clear stats and restore demo inbox</Text>
          </View>
          <ChevronRight color={COLORS.textTertiary} size={20} strokeWidth={2.5} />
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>About</Text>
        <View style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: COLORS.surfaceSecondary }]}>
            <HelpCircle color={COLORS.textSecondary} size={20} strokeWidth={2.5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>CleanMate</Text>
            <Text style={styles.rowSub}>Version 1.0.0</Text>
          </View>
        </View>

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
  sectionLabel: {
    fontSize: 12, fontWeight: "700", letterSpacing: 1, color: COLORS.textTertiary,
    textTransform: "uppercase", marginTop: 20, marginBottom: 8, marginLeft: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceSecondary,
    marginBottom: 10,
  },
  rowIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  rowTitle: { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary },
  rowSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});
