import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PackageCheck, PackageOpen, Plus, Search, X } from "lucide-react-native";
import { useTheme } from "../../src/theme";
import { KIND_COLORS } from "../../src/theme/colors";
import { staggerDelay } from "../../src/theme/motion";
import { useApp } from "../../src/store/appStore";
import { useMove } from "../../src/ui/derive";
import { PressableScale } from "../../src/components/PressableScale";
import { SwipeRow } from "../../src/components/SwipeRow";
import { Chip } from "../../src/components/Bits";
import { Sheet } from "../../src/components/Sheet";
import { BoxTag } from "../../src/components/Widgets";
import { BurstOverlay, NewBoxSheet, SealSheet } from "../../src/components/Sheets";
import { setStatus } from "../../src/data/repo";
import { ESSENTIALS } from "../../src/lib/firstnight";
import { haptics } from "../../src/services/haptics";
import type { Box } from "../../src/data/repo";

type Filter = "all" | "open" | "sealed" | "unpacked";

export default function Boxes() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { boxes, rooms, today, refresh } = useApp();
  const m = useMove();
  const [q, setQ] = useState("");
  const [f, setF] = useState<Filter>("all");
  const [seal, setSeal] = useState<Box | null>(null);
  const [newBox, setNewBox] = useState<string | null | undefined>(undefined);
  const [menu, setMenu] = useState<Box | null>(null);
  const [burst, setBurst] = useState<string | null>(null);
  const query = q.trim().toLowerCase();
  const label = (k: string) => ESSENTIALS.find((e) => e.key === k)?.label ?? k;
  const list = boxes.filter((b) => (f === "all" || b.status === f) && (!query || b.label.toLowerCase().includes(query) || String(b.num) === query || m.boxTags(b).some((x) => label(x).toLowerCase().includes(query))));
  const groups = rooms.map((r) => ({ r, items: list.filter((b) => b.room_id === r.id) })).filter((g) => g.items.length);

  const children: React.ReactNode[] = [];
  const sticky: number[] = [];
  groups.forEach((g) => {
    sticky.push(children.length + 1);
    children.push(
      <View key={`h${g.r.id}`} style={{ backgroundColor: t.colors.background, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: KIND_COLORS[g.r.kind] }} />
          <Text style={{ ...t.typography.overline, color: t.colors.inkMuted, flex: 1 }}>{g.r.name}</Text>
          <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>{m.remaining[g.r.id]} left to pack</Text>
        </View>
      </View>
    );
    children.push(
      <View key={`b${g.r.id}`} style={{ paddingHorizontal: 16, gap: 8 }}>
        {g.items.map((b, i) => (
          <Animated.View key={b.id} entering={FadeInDown.delay(staggerDelay(i)).duration(350)}>
            <SwipeRow
              right={b.status === "open" ? { label: "Seal", icon: <PackageCheck size={18} color="#FFFFFF" />, onTrigger: () => setSeal(b) } : b.status === "sealed" ? { label: "Unpacked", icon: <PackageOpen size={18} color="#FFFFFF" />, onTrigger: async () => { await setStatus(b.id, "unpacked", today); await refresh(); haptics.success(); setBurst(`Box ${b.num} unpacked`); } } : undefined}
              left={b.status !== "open" ? { label: "Reopen", icon: <PackageOpen size={18} color="#FFFFFF" />, onTrigger: async () => { await setStatus(b.id, "open", today); await refresh(); } } : undefined}
            >
              <PressableScale
                accessibilityLabel={`Box ${b.num}`}
                onPress={() => router.push({ pathname: "/box/[id]", params: { id: b.id } })}
                onLongPress={() => {
                  haptics.press();
                  setMenu(b);
                }}
                style={{ backgroundColor: t.colors.surface, borderRadius: 16, padding: 12, gap: 6, opacity: b.status === "unpacked" ? 0.55 : 1 }}
              >
                <BoxTag num={b.num} room={g.r.name} kind={g.r.kind} label={b.label} weight={b.weight} fragile={b.fragile === 1} status={b.status} />
                {m.boxTags(b).length ? (
                  <Text numberOfLines={1} style={{ ...t.typography.caption, color: m.night.open.includes(b.id) ? t.colors.teal : t.colors.inkFaint }}>
                    {m.night.open.includes(b.id) ? "Open first night · " : ""}
                    {m.boxTags(b).map(label).join(", ")}
                  </Text>
                ) : null}
              </PressableScale>
            </SwipeRow>
          </Animated.View>
        ))}
      </View>
    );
  });

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ ...t.typography.title, color: t.colors.ink }}>Boxes</Text>
          <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>
            {boxes.filter((b) => b.status === "open").length} open · {boxes.filter((b) => b.status === "sealed").length} sealed · {boxes.filter((b) => b.status === "unpacked").length} unpacked
          </Text>
        </View>
        <PressableScale accessibilityLabel="New box" onPress={() => setNewBox(null)} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: t.colors.accent }}>
          <Plus size={16} color="#FFFFFF" />
          <Text style={{ ...t.typography.label, color: "#FFFFFF" }}>Box</Text>
        </PressableScale>
      </View>
      <View style={{ paddingHorizontal: 16, gap: 10, paddingBottom: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: t.colors.surface, borderRadius: 14, paddingHorizontal: 12, borderWidth: 1, borderColor: t.colors.border }}>
          <Search size={16} color={t.colors.inkFaint} />
          <TextInput value={q} onChangeText={setQ} placeholder="Find a box, number or thing inside" placeholderTextColor={t.colors.inkFaint} style={{ flex: 1, paddingVertical: 9, color: t.colors.ink, ...t.typography.body }} />
          {q ? (
            <PressableScale accessibilityLabel="Clear search" onPress={() => setQ("")}>
              <X size={16} color={t.colors.inkMuted} />
            </PressableScale>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["all", "open", "sealed", "unpacked"] as Filter[]).map((x) => (
            <Chip key={x} label={x[0].toUpperCase() + x.slice(1)} active={f === x} onPress={() => setF(x)} />
          ))}
        </View>
      </View>
      <ScrollView stickyHeaderIndices={sticky} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 30 }}>
        <View />
        {children}
        {boxes.length === 0 ? <Text style={{ ...t.typography.body, color: t.colors.inkMuted, padding: 20 }}>No boxes yet. Start one with + Box and write its number on it.</Text> : list.length === 0 ? <Text style={{ ...t.typography.caption, color: t.colors.inkMuted, padding: 20 }}>No box matches.</Text> : null}
        {list.length ? <Text style={{ ...t.typography.caption, color: t.colors.inkFaint, textAlign: "center", marginTop: 10 }}>Swipe right to seal or unpack · left to reopen · hold for more</Text> : null}
      </ScrollView>
      <SealSheet box={seal} onClose={() => setSeal(null)} onSaved={setBurst} />
      <NewBoxSheet visible={newBox !== undefined} room={newBox ?? null} onClose={() => setNewBox(undefined)} onSaved={setBurst} />
      <Sheet visible={!!menu} onClose={() => setMenu(null)} title={menu ? `Box ${menu.num}` : ""} subtitle={menu?.label}>
        {menu
          ? [
              ...(menu.status === "open" ? [{ l: "Seal it", run: () => setSeal(menu) }] : []),
              { l: "Another box for this room", run: () => setNewBox(menu.room_id) },
              { l: "Open details", run: () => router.push({ pathname: "/box/[id]", params: { id: menu.id } }) },
            ].map((a) => (
              <PressableScale key={a.l} accessibilityLabel={a.l} onPress={() => { setMenu(null); a.run(); }} style={{ paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, backgroundColor: t.colors.surfaceAlt }}>
                <Text style={{ ...t.typography.body, color: t.colors.ink }}>{a.l}</Text>
              </PressableScale>
            ))
          : null}
      </Sheet>
      <BurstOverlay msg={burst} onDone={() => setBurst(null)} />
    </View>
  );
}
