import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme";
import { KIND_COLORS } from "../../src/theme/colors";
import { staggerDelay } from "../../src/theme/motion";
import { useApp } from "../../src/store/appStore";
import { useMove } from "../../src/ui/derive";
import { AnimatedRing } from "../../src/components/AnimatedRing";
import { AnimatedCounter } from "../../src/components/AnimatedCounter";
import { CategoryRing } from "../../src/components/CategoryRing";
import { BarChart } from "../../src/components/BarChart";
import { DonutChart } from "../../src/components/DonutChart";
import { Heatmap } from "../../src/components/Heatmap";
import { Legend } from "../../src/components/Bits";
import { EmptyState } from "../../src/components/EmptyState";
import { ESSENTIALS } from "../../src/lib/firstnight";
import { addDays, weekStart } from "../../src/lib/time";
import { pct } from "../../src/ui/format";

const WEEKS = 8;

export default function Stats() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { boxes, rooms, today } = useApp();
  const m = useMove();
  const [room, setRoom] = useState<string | null>(null);

  const s = useMemo(() => {
    const scoped = boxes.filter((b) => !room || b.room_id === room);
    const sealed = scoped.filter((b) => b.status !== "open");
    const timed = sealed.filter((b) => b.minutes !== null);
    const avg = timed.length ? timed.reduce((a, b) => a + (b.minutes ?? 0), 0) / timed.length : 0;
    const unpacked = scoped.filter((b) => b.status === "unpacked").length;
    const ring = rooms.map((r) => ({ key: r.id, value: boxes.filter((b) => b.room_id === r.id).length, color: KIND_COLORS[r.kind] }));
    const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
    const bars = days.map((d) => ({ label: d === today ? "T" : String(Number(d.slice(8))), value: sealed.filter((b) => b.sealed_day === d).length }));
    const start = addDays(weekStart(today), -7 * (WEEKS - 1));
    const per = new Map<string, number>();
    for (const b of sealed) if (b.sealed_day) per.set(b.sealed_day, (per.get(b.sealed_day) ?? 0) + 1);
    const peak = Math.max(1, ...per.values());
    const cells = [];
    for (let d = 0; d < 7; d++)
      for (let k = 0; k < WEEKS; k++) {
        const day = addDays(start, k * 7 + d);
        cells.push({ key: day, intensity: day > today ? 0 : (per.get(day) ?? 0) / peak });
      }
    const weights = [
      { k: "light", c: "#E3C79E" },
      { k: "medium", c: t.colors.kraft },
      { k: "heavy", c: "#7A5530" },
    ].map((w) => ({ ...w, n: scoped.filter((b) => b.weight === w.k).length }));
    const tags = ESSENTIALS.map((e) => ({ e, n: scoped.filter((b) => m.boxTags(b).includes(e.key)).length })).filter((x) => x.n > 0);
    return { scoped, sealed, avg, unpacked, ring, bars, cells, weights, tags, fragile: scoped.filter((b) => b.fragile).length };
  }, [boxes, rooms, room, today, m, t]);

  const heat = (i: number) => (i === 0 ? t.colors.backgroundAlt : i < 0.5 ? "#E5C9A4" : i < 0.9 ? t.colors.kraft : t.colors.accent);
  const kinds = [...new Set(rooms.map((r) => r.kind))];

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 }}>
        <Text style={{ ...t.typography.title, color: t.colors.ink }}>Stats</Text>
        <Text style={{ ...t.typography.caption, color: room ? t.colors.accent : t.colors.inkMuted }}>{room ? `${m.roomById.get(room)?.name} only — tap the ring again to clear` : "All rooms"}</Text>
      </View>
      {boxes.length === 0 ? (
        <EmptyState title="No boxes yet" description="Start and seal boxes — pace, progress and the first-night kit show up here." />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 30 }}>
          <Animated.View entering={FadeInDown.duration(400)} style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: t.colors.surface, borderRadius: 20, padding: 12, alignItems: "center", gap: 2 }}>
              <AnimatedCounter value={s.sealed.length} style={{ fontSize: 28, fontWeight: "800", color: t.colors.ink, padding: 0, textAlign: "center", minWidth: 50 }} />
              <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>boxes sealed</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: t.colors.surface, borderRadius: 20, padding: 12, alignItems: "center", gap: 2 }}>
              <AnimatedCounter value={s.avg} style={{ fontSize: 28, fontWeight: "800", color: t.colors.accent, padding: 0, textAlign: "center", minWidth: 50 }} />
              <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>min per box</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: t.colors.surface, borderRadius: 20, padding: 12, alignItems: "center", gap: 2 }}>
              <AnimatedRing progress={s.scoped.length ? s.unpacked / s.scoped.length : 0} size={58} strokeWidth={7} color={t.colors.teal} trackColor={t.colors.tealSoft}>
                <Text style={{ ...t.typography.label, color: t.colors.ink }}>{s.scoped.length ? pct(s.unpacked / s.scoped.length) : "—"}</Text>
              </AnimatedRing>
              <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>unpacked</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(staggerDelay(1)).duration(400)} style={{ backgroundColor: t.colors.surface, borderRadius: 22, padding: 16, gap: 12 }}>
            <Text style={{ ...t.typography.overline, color: t.colors.inkMuted }}>Boxes by room · tap to focus</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <CategoryRing segments={s.ring} selected={room} onSelect={setRoom} size={150} center={<Text style={{ ...t.typography.title, color: t.colors.ink }}>{room ? s.ring.find((x) => x.key === room)?.value : boxes.length}</Text>} />
              <View style={{ flex: 1 }}>
                <Legend rows={s.ring.filter((x) => x.value > 0).map((x) => ({ color: x.color, label: m.roomById.get(x.key)?.name ?? "", value: String(x.value), dim: !!room && room !== x.key }))} />
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(staggerDelay(2)).duration(400)} style={{ backgroundColor: t.colors.surface, borderRadius: 22, padding: 16, gap: 10 }}>
            <Text style={{ ...t.typography.overline, color: t.colors.inkMuted }}>Boxes sealed per day</Text>
            <BarChart data={s.bars} color={room ? KIND_COLORS[m.roomById.get(room)?.kind ?? "storage"] : t.colors.kraft} height={100} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(staggerDelay(3)).duration(400)} style={{ backgroundColor: t.colors.surface, borderRadius: 22, padding: 16, gap: 10 }}>
            <Text style={{ ...t.typography.overline, color: t.colors.inkMuted }}>Learned pace by room type</Text>
            {kinds.map((k) => {
              const r = rooms.find((x) => x.kind === k)!;
              const e = m.paceOf[r.id];
              const maxM = Math.max(...rooms.map((x) => m.paceOf[x.id].minutes));
              return (
                <View key={k} style={{ gap: 4 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ ...t.typography.label, color: t.colors.ink }}>{r.name}</Text>
                    <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>
                      {Math.round(e.minutes)} ± {Math.round(e.sd)} min · {e.n > 0 ? `${e.n.toFixed(1)} boxes` : "guess"}
                    </Text>
                  </View>
                  <View style={{ height: 8, borderRadius: 4, backgroundColor: t.colors.surfaceAlt, overflow: "hidden" }}>
                    <View style={{ width: `${(e.minutes / maxM) * 100}%`, height: 8, backgroundColor: KIND_COLORS[k], opacity: e.n > 0 ? 1 : 0.45 }} />
                  </View>
                </View>
              );
            })}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(staggerDelay(4)).duration(400)} style={{ backgroundColor: t.colors.surface, borderRadius: 22, padding: 16, gap: 10 }}>
            <Text style={{ ...t.typography.overline, color: t.colors.inkMuted }}>Packing days · {WEEKS} weeks</Text>
            <View style={{ width: WEEKS * 21, alignSelf: "center" }}>
              <Heatmap cells={s.cells} colorForIntensity={heat} cellSize={18} gap={3} />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(staggerDelay(5)).duration(400)} style={{ backgroundColor: t.colors.surface, borderRadius: 22, padding: 16, gap: 12, flexDirection: "row", alignItems: "center" }}>
            <DonutChart segments={s.weights.map((w) => ({ value: w.n, color: w.c }))} size={110} strokeWidth={16} />
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ ...t.typography.overline, color: t.colors.inkMuted }}>Weight mix</Text>
              <Legend rows={s.weights.map((w) => ({ color: w.c, label: w.k, value: String(w.n) }))} />
              <Text style={{ ...t.typography.caption, color: t.colors.accent }}>{s.fragile} fragile</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(staggerDelay(6)).duration(400)} style={{ backgroundColor: t.colors.surface, borderRadius: 22, padding: 16, gap: 8 }}>
            <Text style={{ ...t.typography.overline, color: t.colors.inkMuted }}>Essentials, by number of boxes</Text>
            {s.tags.length === 0 ? <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>No boxes tagged with first-night essentials yet.</Text> : null}
            {s.tags.map(({ e, n }) => (
              <View key={e.key} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ ...t.typography.body, color: t.colors.ink, flex: 1 }}>{e.label}</Text>
                <Text style={{ ...t.typography.label, color: n > 1 ? t.colors.amber : t.colors.teal }}>{n > 1 ? `spread over ${n} boxes` : "in one box"}</Text>
              </View>
            ))}
          </Animated.View>
        </ScrollView>
      )}
    </View>
  );
}
