import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, CalendarDays, Clock, Home, Plus, RotateCcw, Trash2, Vibrate } from "lucide-react-native";
import { useTheme } from "../src/theme";
import { KIND_COLORS } from "../src/theme/colors";
import { staggerDelay } from "../src/theme/motion";
import { useApp } from "../src/store/appStore";
import { hm } from "../src/ui/derive";
import { goBack } from "../src/ui/nav";
import { PressableScale } from "../src/components/PressableScale";
import { Chip, Stepper } from "../src/components/Bits";
import { Toggle } from "../src/components/Toggle";
import { addRoom, deleteRoom, resetAll, saveSetting, updateRoom } from "../src/data/repo";
import { ROOM_PRESETS } from "../src/data/presets";
import { addDays, dayLabel, daysBetween, weekdayLabel } from "../src/lib/time";

// Settings — сетка иконок-разделов сверху и карточки комнат ниже.
export default function SettingsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, rooms, today, refresh } = useApp();
  const [confirm, setConfirm] = useState(false);
  const [warn, setWarn] = useState<string | null>(null);
  const save = async (k: string, v: string) => {
    await saveSetting(k, v);
    await refresh();
  };
  const days = Math.max(1, daysBetween(today, settings.moveDay));
  const tile = (i: number, icon: React.ReactNode, title: string, control: React.ReactNode) => (
    <Animated.View key={title} entering={FadeInDown.delay(staggerDelay(i)).duration(400)} style={{ width: "48%", backgroundColor: t.colors.surface, borderRadius: 20, padding: 14, gap: 10 }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: t.colors.accentSoft, alignItems: "center", justifyContent: "center" }}>{icon}</View>
      <Text style={{ ...t.typography.label, color: t.colors.ink }}>{title}</Text>
      {control}
    </Animated.View>
  );
  const missing = ROOM_PRESETS.filter((p) => !rooms.some((r) => r.name === p.name));
  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
        <PressableScale accessibilityLabel="Back" onPress={goBack} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.surface, alignItems: "center", justifyContent: "center" }}>
          <ArrowLeft size={20} color={t.colors.ink} />
        </PressableScale>
        <Text style={{ ...t.typography.subtitle, color: t.colors.ink }}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 40 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 }}>
          {tile(0, <CalendarDays size={18} color={t.colors.accent} />, `Move · ${weekdayLabel(settings.moveDay)} ${dayLabel(settings.moveDay)}`, <Stepper value={days} min={1} max={120} format={(v) => `${v} d`} onChange={(v) => save("moveDay", addDays(today, v))} />)}
          {tile(1, <Clock size={18} color={t.colors.accent} />, "Weekday packing", <Stepper value={settings.weekdayMin} step={30} min={0} max={480} format={(v) => hm(v)} onChange={(v) => save("weekdayMin", String(v))} />)}
          {tile(2, <Clock size={18} color={t.colors.accent} />, "Weekend packing", <Stepper value={settings.weekendMin} step={30} min={0} max={600} format={(v) => hm(v)} onChange={(v) => save("weekendMin", String(v))} />)}
          {tile(3, <Vibrate size={18} color={t.colors.accent} />, "Vibration", <Toggle value={settings.haptics} onValueChange={(v) => save("haptics", v ? "1" : "0")} />)}
        </View>

        <Animated.View entering={FadeInDown.delay(staggerDelay(4)).duration(400)} style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Home size={16} color={t.colors.inkMuted} />
            <Text style={{ ...t.typography.overline, color: t.colors.inkMuted }}>Rooms</Text>
          </View>
          {rooms.map((r) => (
            <View key={r.id} style={{ backgroundColor: t.colors.surface, borderRadius: 18, padding: 14, gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: KIND_COLORS[r.kind] }} />
                <Text style={{ ...t.typography.label, fontSize: 15, color: t.colors.ink, flex: 1 }}>{r.name}</Text>
                <PressableScale accessibilityLabel={`Remove ${r.name}`} onPress={async () => { const ok = await deleteRoom(r.id); if (!ok) setWarn(`${r.name} has boxes — move them first.`); await refresh(); }}>
                  <Trash2 size={16} color={t.colors.inkFaint} />
                </PressableScale>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>Expected boxes</Text>
                <Stepper value={r.est_boxes} min={1} max={60} onChange={async (v) => { await updateRoom(r.id, { est_boxes: v }); await refresh(); }} />
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>Used until … days before</Text>
                <Stepper value={r.window_days} min={1} max={30} onChange={async (v) => { await updateRoom(r.id, { window_days: v }); await refresh(); }} />
              </View>
            </View>
          ))}
          {warn ? <Text style={{ ...t.typography.caption, color: t.colors.accent }}>{warn}</Text> : null}
          {missing.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {missing.map((p) => (
                <Chip key={p.name} label={p.name} color={KIND_COLORS[p.kind]} icon={<Plus size={12} color={t.colors.ink} />} active={false} onPress={async () => { await addRoom(p.name, p.kind, p.est, p.window); await refresh(); }} />
              ))}
            </View>
          ) : null}
        </Animated.View>

        <PressableScale
          accessibilityLabel={confirm ? "Tap again to erase" : "Erase all data"}
          onPress={async () => {
            if (!confirm) return setConfirm(true);
            await resetAll();
            await refresh();
            setConfirm(false);
            goBack();
          }}
          style={{ flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 999, backgroundColor: confirm ? t.colors.danger : t.colors.surface }}
        >
          <RotateCcw size={16} color={confirm ? "#FFFFFF" : t.colors.danger} />
          <Text style={{ ...t.typography.label, color: confirm ? "#FFFFFF" : t.colors.danger }}>{confirm ? "Tap again to erase everything" : "Erase all data"}</Text>
        </PressableScale>
      </ScrollView>
    </View>
  );
}
