import React from "react";
import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { StyleSheet, Platform, View } from "react-native";
import { Home, Images, Layers, Mail, Settings } from "lucide-react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#005BB5",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: -2 },
        tabBarStyle: {
          position: "absolute",
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === "ios" ? 84 : 68,
          paddingTop: 8,
          backgroundColor: "transparent",
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={80}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.95)", borderTopWidth: 1, borderTopColor: "#F1F5F9" }]} />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size ?? 22} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="photos"
        options={{
          title: "Photos",
          tabBarIcon: ({ color, size }) => <Images color={color} size={size ?? 22} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="albums"
        options={{
          title: "Albums",
          tabBarIcon: ({ color, size }) => <Layers color={color} size={size ?? 22} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="emails"
        options={{
          title: "Emails",
          tabBarIcon: ({ color, size }) => <Mail color={color} size={size ?? 22} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size ?? 22} strokeWidth={2.2} />,
        }}
      />
    </Tabs>
  );
}
