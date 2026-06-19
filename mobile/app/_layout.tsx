import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#0F0F0F" },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="index" options={{ title: "Home" }} />
        <Stack.Screen name="scriptment" options={{ title: "Scriptment" }} />
        <Stack.Screen name="shoot-list" options={{ title: "Shoot List" }} />
        <Stack.Screen name="archive" options={{ title: "Projects" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
        <Stack.Screen name="gear" options={{ title: "Gear" }} />
      </Stack>
    </>
  );
}
