import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from "../src/theme/ThemeProvider";
import { migrerCles } from "../src/storage/migration";

function RootNav() {
  const t = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: t.colors.vert },
        headerTintColor: "#fff",
        contentStyle: { backgroundColor: t.colors.fond },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="serie/[serie]/index" options={{ title: "Série" }} />
      <Stack.Screen name="serie/[serie]/[matiere]/index" options={{ title: "Matière" }} />
      <Stack.Screen name="pdf/[key]/index" options={{ title: "Lecteur" }} />
      <Stack.Screen name="a-propos" options={{ title: "À propos" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // Migration unique des favoris/historique après la fusion des séries (v1.5)
    void migrerCles();
  }, []);

  return (
    <ThemeProvider>
      <StatusBar style="light" />
      <RootNav />
    </ThemeProvider>
  );
}
