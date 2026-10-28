import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme/ThemeProvider";

export default function TabsLayout() {
  const t = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: t.colors.vert },
        headerTintColor: "#fff",
        headerTitleStyle: { fontSize: 20, fontWeight: "800", letterSpacing: 0.3 },
        headerShadowVisible: false,
        tabBarActiveTintColor: t.colors.vertClair,
        tabBarInactiveTintColor: t.colors.texteSecondaire,
        tabBarStyle: { backgroundColor: t.colors.carte, borderTopColor: t.colors.bordure },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="series"
        options={{
          title: "Séries du BAC",
          tabBarIcon: ({ color, size }) => <Ionicons name="library" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="favoris"
        options={{
          title: "Favoris",
          tabBarIcon: ({ color, size }) => <Ionicons name="star" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="importes"
        options={{
          title: "Importés",
          tabBarIcon: ({ color, size }) => <Ionicons name="download" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="parametres"
        options={{
          title: "Paramètres",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
