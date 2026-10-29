import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BarChart3, CalendarRange, Home, Package } from "lucide-react-native";
import { useTheme } from "../../src/theme";

// Нижний таб-бар: четыре раздела, активный — красный скотч.
export default function TabsLayout() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.colors.accent,
        tabBarInactiveTintColor: t.colors.inkFaint,
        tabBarStyle: { backgroundColor: t.colors.surface, borderTopColor: t.colors.border, height: 62 + insets.bottom, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        sceneStyle: { backgroundColor: t.colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarAccessibilityLabel: "Tab Home", tabBarIcon: ({ color }) => <Home size={22} color={color} /> }} />
      <Tabs.Screen name="boxes" options={{ title: "Boxes", tabBarAccessibilityLabel: "Tab Boxes", tabBarIcon: ({ color }) => <Package size={22} color={color} /> }} />
      <Tabs.Screen name="plan" options={{ title: "Plan", tabBarAccessibilityLabel: "Tab Plan", tabBarIcon: ({ color }) => <CalendarRange size={22} color={color} /> }} />
      <Tabs.Screen name="stats" options={{ title: "Stats", tabBarAccessibilityLabel: "Tab Stats", tabBarIcon: ({ color }) => <BarChart3 size={22} color={color} /> }} />
    </Tabs>
  );
}
