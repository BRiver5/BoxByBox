import { useEffect } from "react";
import { Pressable, Text, View, type GestureResponderEvent } from "react-native";
import Svg, { Circle, Path, Text as SvgText } from "react-native-svg";
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { Wine } from "lucide-react-native";
import { useTheme } from "../theme";
import { KIND_COLORS } from "../theme/colors";
import { PressableScale } from "./PressableScale";
import { haptics } from "../services/haptics";
import { ESSENTIALS } from "../lib/firstnight";
import type { Chunk } from "../lib/packplan";

function Bar({ frac, color, delay, early, on }: { frac: number; color: string; delay: number; early: boolean; on: boolean }) {
  const t = useTheme();
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = 0;
    w.value = withDelay(delay, withTiming(frac, { duration: 500, easing: Easing.out(Easing.cubic) }));
  }, [frac, delay]);
  const st = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return <Animated.View style={[{ height: 14, borderRadius: 5, backgroundColor: color, opacity: early ? 0.55 : 1, borderWidth: on ? 2 : 0, borderColor: t.colors.ink }, st]} />;
}

// Диаграмма упаковки: строки — комнаты, столбцы — дни до переезда, полоса в
// ячейке ∝ минутам упаковки в этот день; бледная — раньше «окна» комнаты
// (пока ещё ей пользуешься). Тап по строке выбирает комнату.
export function RoomStrip({ rooms, chunks, days, dayLabel, selected, onSelect }: { rooms: { id: string; name: string; kind: string; window: number }[]; chunks: Chunk[]; days: number; dayLabel: (d: number) => string; selected: string | null; onSelect: (id: string | null) => void }) {
  const t = useTheme();
  const max = Math.max(1, ...chunks.map((c) => c.minutes));
  const shown = Math.min(days, 14);
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", paddingLeft: 86 }}>
        {Array.from({ length: shown }, (_, d) => (
          <Text key={d} numberOfLines={1} style={{ flex: 1, ...t.typography.caption, fontSize: 9, color: d === 0 ? t.colors.accent : t.colors.inkFaint, textAlign: "center" }}>
            {dayLabel(d).slice(0, 2)}
          </Text>
        ))}
      </View>
      {rooms.map((r, i) => {
        const on = selected === r.id;
        return (
          <PressableScale key={r.id} accessibilityLabel={`Strip ${r.name}`} scaleTo={0.98} onPress={() => { haptics.tick(); onSelect(on ? null : r.id); }} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 3, borderRadius: 8, backgroundColor: on ? t.colors.kraftSoft : "transparent" }}>
            <Text numberOfLines={1} style={{ width: 86, ...t.typography.caption, color: t.colors.ink, fontWeight: on ? "700" : "400" }}>
              {r.name}
            </Text>
            {Array.from({ length: shown }, (_, d) => {
              const c = chunks.find((x) => x.room === r.id && x.day === d);
              const inWindow = days - d <= r.window;
              return (
                <View key={d} style={{ flex: 1, height: 18, paddingHorizontal: 1.5, justifyContent: "center", backgroundColor: inWindow ? t.colors.surfaceAlt : "transparent" }}>
                  {c ? <Bar frac={Math.max(0.2, c.minutes / max)} color={KIND_COLORS[r.kind] ?? t.colors.kraft} delay={i * 50 + d * 25} early={c.early} on={on} /> : null}
                </View>
              );
            })}
          </PressableScale>
        );
      })}
    </View>
  );
}

const TAU = Math.PI * 2;
function wedge(c: number, r0: number, r1: number, a0: number, a1: number) {
  const p = (r: number, a: number) => `${c + r * Math.cos(a)} ${c + r * Math.sin(a)}`;
  return `M ${p(r1, a0)} A ${r1} ${r1} 0 0 1 ${p(r1, a1)} L ${p(r0, a1)} A ${r0} ${r0} 0 0 0 ${p(r0, a0)} Z`;
}

// Колесо первой ночи: сектор на каждую нужную категорию (ширина ∝ важности),
// закрашен — найдётся в коробках, которые план велит вскрыть первыми.
// Тап по сектору — выбор категории.
export function CoverageWheel({ wanted, covered, size = 200, selected, onSelect, center }: { wanted: string[]; covered: string[]; size?: number; selected: string | null; onSelect: (k: string | null) => void; center?: React.ReactNode }) {
  const t = useTheme();
  const c = size / 2;
  const r1 = c - 6;
  const r0 = r1 * 0.58;
  const items = ESSENTIALS.filter((e) => wanted.includes(e.key));
  const total = items.reduce((s, e) => s + e.weight, 0) || 1;
  let acc = 0;
  const segs = items.map((e) => {
    const a0 = (acc / total) * TAU - Math.PI / 2;
    acc += e.weight;
    return { e, a0, a1: (acc / total) * TAU - Math.PI / 2 };
  });
  const onPress = (ev: GestureResponderEvent) => {
    const dx = ev.nativeEvent.locationX - c;
    const dy = ev.nativeEvent.locationY - c;
    const d = Math.hypot(dx, dy);
    if (d < r0 || d > r1) return onSelect(null);
    let a = Math.atan2(dy, dx);
    if (a < -Math.PI / 2) a += TAU;
    const hit = segs.find((s) => a >= s.a0 && a < s.a1);
    if (hit) {
      haptics.tick();
      onSelect(selected === hit.e.key ? null : hit.e.key);
    }
  };
  return (
    <Pressable onPress={onPress} accessibilityLabel="First night wheel, tap a slice" style={{ width: size, height: size, alignSelf: "center" }}>
      <Animated.View entering={FadeIn.duration(450)}>
        <Svg width={size} height={size}>
          <Circle cx={c} cy={c} r={(r0 + r1) / 2} stroke={t.colors.surfaceAlt} strokeWidth={r1 - r0} fill="none" />
          {segs.map((s) => {
            const ok = covered.includes(s.e.key);
            const on = selected === s.e.key;
            return <Path key={s.e.key} d={wedge(c, r0, on ? r1 + 0 : r1 - 3, s.a0 + 0.025, s.a1 - 0.025)} fill={ok ? t.colors.teal : t.colors.accentSoft} stroke={on ? t.colors.ink : "none"} strokeWidth={on ? 2 : 0} />;
          })}
          {segs.map((s) => {
            const a = (s.a0 + s.a1) / 2;
            const rr = (r0 + r1) / 2;
            return (
              <SvgText key={`t${s.e.key}`} x={c + rr * Math.cos(a)} y={c + rr * Math.sin(a) + 4} fontSize={10} fontWeight="700" fill={covered.includes(s.e.key) ? "#FFFFFF" : t.colors.accent} textAnchor="middle">
                {s.e.short}
              </SvgText>
            );
          })}
        </Svg>
      </Animated.View>
      <View pointerEvents="none" style={{ position: "absolute", left: c - r0, top: c - r0, width: r0 * 2, height: r0 * 2, alignItems: "center", justifyContent: "center" }}>
        {center}
      </View>
    </Pressable>
  );
}

// Бирка коробки: номер крупно, комната цветной полосой, отметки «хрупкое» и вес.
export function BoxTag({ num, room, kind, label, weight, fragile, status }: { num: number; room: string; kind: string; label: string; weight: string; fragile: boolean; status: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: status === "open" ? t.colors.surfaceAlt : t.colors.kraft, borderWidth: status === "open" ? 2 : 0, borderStyle: "dashed", borderColor: t.colors.kraft, alignItems: "center", justifyContent: "center" }}>
        {status !== "open" ? <View style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, alignItems: "center" }}><View style={{ width: 8, height: "100%", backgroundColor: t.colors.accent, opacity: 0.5 }} /></View> : null}
        <Text style={{ fontSize: 20, fontWeight: "800", color: status === "open" ? t.colors.kraft : "#FFFFFF", textShadowColor: "rgba(0,0,0,0.25)", textShadowRadius: status === "open" ? 0 : 2 }}>{num}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1} style={{ ...t.typography.label, fontSize: 15, color: t.colors.ink }}>{label || "Untitled box"}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: KIND_COLORS[kind] ?? t.colors.kraft }} />
          <Text numberOfLines={1} style={{ ...t.typography.caption, color: t.colors.inkMuted }}>
            {room} · {weight}
          </Text>
          {fragile ? <Wine size={13} color={t.colors.accent} /> : null}
        </View>
      </View>
    </View>
  );
}
