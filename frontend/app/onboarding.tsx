import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowRight } from "lucide-react-native";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    key: "1",
    title: "Spot Duplicates Instantly",
    subtitle:
      "Our AI identifies exact copies and visually similar photos, helping you reclaim gigabytes of space.",
    image:
      "https://images.unsplash.com/photo-1676883344224-2fa5de6025db?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NjZ8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwc3RhY2tlZCUyMHBob3RvcyUyMGFsYnVtfGVufDB8fHx8MTc3NzU3NjA3MXww&ixlib=rb-4.1.0&q=85",
  },
  {
    key: "2",
    title: "Smart Photo Organization",
    subtitle:
      "Automatically group your gallery into receipts, selfies, food, and more. Keep what matters.",
    image:
      "https://images.unsplash.com/photo-1567473030492-533b30c5494c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDR8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwY2xlYW4lMjBlbWFpbCUyMGVudmVsb3BlfGVufDB8fHx8MTc3NzU3NjA3MXww&ixlib=rb-4.1.0&q=85",
  },
  {
    key: "3",
    title: "Declutter Your Inbox",
    subtitle:
      "Find and bulk-delete spam, promotions, and useless old threads with one tap.",
    image:
      "https://images.unsplash.com/photo-1597496610123-889e0aab4816?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGdsb3dpbmclMjBibHVlJTIwc3BhcmslMjBpbnRlbGxpZ2VuY2V8ZW58MHx8fHwxNzc3NTc2MDcxfDA&ixlib=rb-4.1.0&q=85",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const listRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(i);
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToOffset({ offset: (index + 1) * width, animated: true });
    } else {
      router.replace("/(tabs)");
    }
  };

  const skip = () => router.replace("/(tabs)");

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Text style={styles.logo} testID="onboarding-logo">CleanMate</Text>
        <TouchableOpacity onPress={skip} testID="onboarding-skip-btn">
          <Text style={styles.skip}>Skip</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(i) => i.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={styles.imageWrap}>
              <Image source={{ uri: item.image }} style={styles.image} />
            </View>
            <Text style={styles.title} testID={`onboarding-title-${item.key}`}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === index && styles.dotActive]}
          />
        ))}
      </View>

      <TouchableOpacity
        style={styles.cta}
        onPress={next}
        testID="onboarding-next-btn"
        activeOpacity={0.85}
      >
        <Text style={styles.ctaText}>
          {index === SLIDES.length - 1 ? "Start Cleaning" : "Next"}
        </Text>
        <ArrowRight color="#FFFFFF" size={20} strokeWidth={2.5} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  topBar: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    fontSize: 20,
    fontWeight: "800",
    color: "#020617",
    letterSpacing: 0.2,
  },
  skip: { fontSize: 15, fontWeight: "600", color: "#64748B" },
  slide: {
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  imageWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    marginTop: 8,
    marginBottom: 40,
  },
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#020617",
    textAlign: "center",
    letterSpacing: 0.2,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "400",
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E2E8F0",
  },
  dotActive: {
    width: 24,
    backgroundColor: "#005BB5",
  },
  cta: {
    marginHorizontal: 24,
    marginBottom: 8,
    backgroundColor: "#005BB5",
    paddingVertical: 18,
    borderRadius: 9999,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: "#005BB5",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  ctaText: { color: "#FFFFFF", fontWeight: "700", fontSize: 17, letterSpacing: 0.2 },
});
