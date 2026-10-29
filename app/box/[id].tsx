import { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, PackageCheck, PackageOpen, Trash2 } from "lucide-react-native";
import { useTheme } from "../../src/theme";
import { KIND_COLORS } from "../../src/theme/colors";
import { staggerDelay } from "../../src/theme/motion";
import { useApp } from "../../src/store/appStore";
import { hm, useMove } from "../../src/ui/derive";
import { goBack } from "../../src/ui/nav";
import { PressableScale } from "../../src/components/PressableScale";
import { Chip } from "../../src/components/Bits";
import { Segmented } from "../../src/components/Segmented";
import { Toggle } from "../../src/components/Toggle";
import { BoxTag } from "../../src/components/Widgets";
import { BurstOverlay, SealSheet } from "../../src/components/Sheets";
import { deleteBox, setStatus, updateBox } from "../../src/data/repo";
import { ESSENTIALS } from "../../src/lib/firstnight";
import { dayLabel } from "../../src/lib/time";
import { haptics } from "../../src/services/haptics";

export default function BoxScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { boxes, rooms, today, refresh } = useApp();
  const m = useMove();
  const b = boxes.find((x) => x.id === id);
  const [label, setLabel] = useState(b?.label ?? "");
  const [seal, setSeal] = useState(false);
  const [burst, setBurst] = useState<string | null>(null);
  useEffect(() => setLabel(b?.label ?? ""), [b?.id]);
  if (!b) return null;
  const room = m.roomById.get(b.room_id);
  const tags = m.boxTags(b);
  const firstNight = m.night.open.indexOf(b.id);
  const save = async (patch: Parameters<typeof updateBox>[1]) => {
    await updateBox(b.id, patch);
    await refresh();
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
        <PressableScale accessibilityLabel="Back" onPress={goBack} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.surface, alignItems: "center", justifyContent: "center" }}>
          <ArrowLeft size={20} color={t.colors.ink} />
        </PressableScale>
        <Text style={{ ...t.typography.subtitle, color: t.colors.ink, flex: 1 }}>Box {b.num}</Text>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 100 }}>
        <Animated.View entering={FadeInDown.duration(400)} style={{ backgroundColor: t.colors.surface, borderRadius: 22, padding: 16, gap: 12 }}>
          <BoxTag num={b.num} room={room?.name ?? ""} kind={room?.kind ?? "storage"} label={b.label} weight={b.weight} fragile={b.fragile === 1} status={b.status} />
          <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>
            Started {dayLabel(b.created_day)}
            {b.sealed_day ? ` · sealed ${dayLabel(b.sealed_day)} in ${hm(b.minutes ?? 0)}` : " · still open"}
            {b.unpacked_day ? ` · unpacked ${dayLabel(b.unpacked_day)}` : ""}
          </Text>
          {firstNight >= 0 ? (
            <View style={{ backgroundColor: t.colors.tealSoft, borderRadius: 12, padding: 10 }}>
              <Text style={{ ...t.typography.label, color: t.colors.teal }}>Open #{firstNight + 1} on the first night — load it last.</Text>
            </View>
          ) : null}
          <TextInput
            value={label}
            onChangeText={setLabel}
            onEndEditing={() => save({ label: label.trim() })}
            placeholder="What's inside"
            placeholderTextColor={t.colors.inkFaint}
            style={{ ...t.typography.body, color: t.colors.ink, backgroundColor: t.colors.surfaceAlt, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(staggerDelay(1)).duration(400)} style={{ backgroundColor: t.colors.surface, borderRadius: 22, padding: 16, gap: 10 }}>
          <Text style={{ ...t.typography.overline, color: t.colors.inkMuted }}>Room</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {rooms.map((r) => (
              <Chip key={r.id} label={r.name} color={KIND_COLORS[r.kind]} active={b.room_id === r.id} onPress={() => save({ room_id: r.id })} />
            ))}
          </View>
          <Text style={{ ...t.typography.overline, color: t.colors.inkMuted }}>Weight</Text>
          <Segmented items={[{ key: "light" as const, label: "Light" }, { key: "medium" as const, label: "Medium" }, { key: "heavy" as const, label: "Heavy" }]} value={b.weight} onChange={(v) => save({ weight: v })} />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ ...t.typography.label, color: t.colors.ink }}>Fragile</Text>
            <Toggle value={b.fragile === 1} onValueChange={(v) => save({ fragile: v ? 1 : 0 })} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(staggerDelay(2)).duration(400)} style={{ backgroundColor: t.colors.surface, borderRadius: 22, padding: 16, gap: 10 }}>
          <Text style={{ ...t.typography.overline, color: t.colors.inkMuted }}>First-night essentials inside</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {ESSENTIALS.map((e) => (
              <Chip key={e.key} label={e.label} active={tags.includes(e.key)} onPress={() => save({ tags: JSON.stringify(tags.includes(e.key) ? tags.filter((x) => x !== e.key) : [...tags, e.key]) })} />
            ))}
          </View>
        </Animated.View>

        <PressableScale
          accessibilityLabel="Delete box"
          onPress={async () => {
            await deleteBox(b.id);
            await refresh();
            goBack();
          }}
          style={{ flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingVertical: 12 }}
        >
          <Trash2 size={16} color={t.colors.danger} />
          <Text style={{ ...t.typography.label, color: t.colors.danger }}>Delete box {b.num}</Text>
        </PressableScale>
      </ScrollView>

      <View style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 14 }}>
        {b.status === "open" ? (
          <PressableScale accessibilityLabel="Seal this box" onPress={() => setSeal(true)} style={{ flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingVertical: 15, borderRadius: 999, backgroundColor: t.colors.accent }}>
            <PackageCheck size={18} color="#FFFFFF" />
            <Text style={{ ...t.typography.subtitle, color: "#FFFFFF" }}>Seal this box</Text>
          </PressableScale>
        ) : b.status === "sealed" ? (
          <PressableScale
            accessibilityLabel="Mark unpacked"
            onPress={async () => {
              await setStatus(b.id, "unpacked", today);
              await refresh();
              haptics.success();
              setBurst(`Box ${b.num} unpacked`);
            }}
            style={{ flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingVertical: 15, borderRadius: 999, backgroundColor: t.colors.teal }}
          >
            <PackageOpen size={18} color="#FFFFFF" />
            <Text style={{ ...t.typography.subtitle, color: "#FFFFFF" }}>Unpacked it</Text>
          </PressableScale>
        ) : null}
      </View>
      <SealSheet box={seal ? b : null} onClose={() => setSeal(false)} onSaved={setBurst} />
      <BurstOverlay msg={burst} onDone={() => setBurst(null)} />
    </View>
  );
}
