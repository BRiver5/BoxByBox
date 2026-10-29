import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Moon, Package, Plus, Settings2, Timer, Truck } from "lucide-react-native";
import { useTheme } from "../../src/theme";
import { KIND_COLORS } from "../../src/theme/colors";
import { staggerDelay } from "../../src/theme/motion";
import { useApp } from "../../src/store/appStore";
import { hm, useMove } from "../../src/ui/derive";
import { PressableScale } from "../../src/components/PressableScale";
import { AnimatedRing } from "../../src/components/AnimatedRing";
import { AnimatedCounter } from "../../src/components/AnimatedCounter";
import { BurstOverlay, NewBoxSheet, SealSheet, SetupSheet } from "../../src/components/Sheets";
import { dayLabel, weekdayLabel } from "../../src/lib/time";
import { pct, plural } from "../../src/ui/format";
import { haptics } from "../../src/services/haptics";
import type { Box } from "../../src/data/repo";

// Tab Dashboard: компактный хедер и мозаика 2-колоночных плиток.
export default function Home() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { boxes, rooms, settings, configured, wanted } = useApp();
  const m = useMove();
  const [setup, setSetup] = useState(false);
  const [newBox, setNewBox] = useState<string | null | undefined>(undefined);
  const [seal, setSeal] = useState<Box | null>(null);
  const [burst, setBurst] = useState<string | null>(null);

  const sealed = boxes.filter((b) => b.status !== "open").length;
  const totalEst = rooms.reduce((s, r) => s + Math.max(r.est_boxes, boxes.filter((b) => b.room_id === r.id).length), 0);
  const todayChunks = m.plan.chunks.filter((c) => c.day === 0);
  const open = boxes.filter((b) => b.status === "open");
  const tone = m.plan.pOnTime >= 0.8 ? t.colors.teal : m.plan.pOnTime >= 0.5 ? t.colors.amber : t.colors.accent;
  const tile = { backgroundColor: t.colors.surface, borderRadius: 22, padding: 14 } as const;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ ...t.typography.overline, color: t.colors.accent }}>Box by Box</Text>
          <Text style={{ ...t.typography.subtitle, color: t.colors.ink }}>{configured ? `Moving ${weekdayLabel(settings.moveDay)}, ${dayLabel(settings.moveDay)}` : "Plan your move"}</Text>
        </View>
        <PressableScale accessibilityLabel="Settings" onPress={() => router.push("/settings")} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: t.colors.border }}>
          <Settings2 size={18} color={t.colors.ink} />
        </PressableScale>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 10, paddingBottom: 30 }}>
        {!configured || rooms.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(400)} style={{ ...tile, padding: 20, gap: 12 }}>
            <Truck size={28} color={t.colors.accent} />
            <Text style={{ ...t.typography.title, color: t.colors.ink }}>Pack without the panic</Text>
            {["Pick your moving day and rooms.", "Number every box as you start it; seal it with how long it took.", "The plan spreads packing so you use each room as long as you can."].map((x, i) => (
              <Animated.View key={x} entering={FadeInDown.delay(staggerDelay(i + 1)).duration(400)} style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: t.colors.accentSoft, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ ...t.typography.label, color: t.colors.accent }}>{i + 1}</Text>
                </View>
                <Text style={{ ...t.typography.body, color: t.colors.ink, flex: 1 }}>{x}</Text>
              </Animated.View>
            ))}
            <PressableScale accessibilityLabel="Set up move" onPress={() => setSetup(true)} style={{ alignItems: "center", paddingVertical: 14, borderRadius: 999, backgroundColor: t.colors.accent }}>
              <Text style={{ ...t.typography.subtitle, color: "#FFFFFF" }}>Set up my move</Text>
            </PressableScale>
          </Animated.View>
        ) : (
          <>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Animated.View entering={FadeInDown.duration(400)} style={{ ...tile, flex: 1, alignItems: "center", gap: 4 }}>
                <AnimatedRing progress={totalEst ? sealed / totalEst : 0} size={104} strokeWidth={11} color={t.colors.kraft} trackColor={t.colors.kraftSoft}>
                  <AnimatedCounter value={m.days} style={{ fontSize: 30, fontWeight: "800", color: t.colors.ink, padding: 0, textAlign: "center", minWidth: 50 }} />
                  <Text style={{ fontSize: 10, fontWeight: "700", color: t.colors.inkMuted }}>DAYS LEFT</Text>
                </AnimatedRing>
                <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>
                  {sealed} of ~{totalEst} boxes sealed
                </Text>
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(staggerDelay(1)).duration(400)} style={{ ...tile, flex: 1, gap: 6 }}>
                <Text style={{ ...t.typography.overline, color: t.colors.inkMuted }}>On time?</Text>
                <Text style={{ fontSize: 34, fontWeight: "800", color: tone }}>{pct(m.plan.pOnTime)}</Text>
                <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>
                  {hm(m.plan.total)} left vs {hm(m.plan.capacity)} of packing time
                </Text>
                {m.plan.late > 0 ? <Text style={{ ...t.typography.label, color: t.colors.accent }}>{hm(m.plan.late)} won't fit</Text> : null}
              </Animated.View>
            </View>

            <Animated.View entering={FadeInDown.delay(staggerDelay(2)).duration(400)} style={{ ...tile, gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Timer size={16} color={t.colors.accent} />
                <Text style={{ ...t.typography.overline, color: t.colors.inkMuted, flex: 1 }}>Today's packing</Text>
                <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>{hm(m.caps[0]?.minutes ?? 0)} set aside</Text>
              </View>
              {todayChunks.length === 0 ? <Text style={{ ...t.typography.body, color: t.colors.inkMuted }}>Nothing planned today — enjoy the rooms while you have them.</Text> : null}
              {todayChunks.map((c) => {
                const r = m.roomById.get(c.room)!;
                const n = Math.max(1, Math.round(c.minutes / m.paceOf[c.room].minutes));
                return (
                  <View key={c.room} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={{ width: 10, height: 34, borderRadius: 5, backgroundColor: KIND_COLORS[r.kind] }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...t.typography.label, fontSize: 16, color: t.colors.ink }}>{r.name}</Text>
                      <Text style={{ ...t.typography.caption, color: c.early ? t.colors.amber : t.colors.inkMuted }}>
                        ~{plural(n, "box")} · {hm(c.minutes)}
                        {c.early ? " · before you're done using it" : ""}
                      </Text>
                    </View>
                    <PressableScale accessibilityLabel={`New box ${r.name}`} onPress={() => setNewBox(c.room)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: t.colors.accentSoft }}>
                      <Text style={{ ...t.typography.label, color: t.colors.accent }}>Start box</Text>
                    </PressableScale>
                  </View>
                );
              })}
            </Animated.View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Animated.View entering={FadeInDown.delay(staggerDelay(3)).duration(400)} style={{ flex: 1 }}>
                <PressableScale accessibilityLabel="First night tile" onPress={() => router.push({ pathname: "/plan", params: { tab: "night" } })} style={{ ...tile, gap: 6, minHeight: 130 }}>
                  <Moon size={18} color={t.colors.teal} />
                  <Text style={{ fontSize: 28, fontWeight: "800", color: t.colors.ink }}>{m.night.max ? pct(m.night.score / m.night.max) : "—"}</Text>
                  <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>
                    first-night kit · {wanted.length - m.night.missing.length}/{wanted.length} things in {plural(m.night.open.length, "box")}
                  </Text>
                </PressableScale>
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(staggerDelay(4)).duration(400)} style={{ flex: 1 }}>
                <PressableScale accessibilityLabel="New box tile" onPress={() => { haptics.press(); setNewBox(todayChunks[0]?.room ?? null); }} style={{ ...tile, minHeight: 130, alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 2, borderStyle: "dashed", borderColor: t.colors.kraft, backgroundColor: t.colors.kraftSoft }}>
                  <Plus size={26} color={t.colors.kraft} />
                  <Text style={{ ...t.typography.label, color: t.colors.ink }}>New box</Text>
                  <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>#{(boxes.reduce((s, b) => Math.max(s, b.num), 0) || 0) + 1}</Text>
                </PressableScale>
              </Animated.View>
            </View>

            {open.length ? (
              <Animated.View entering={FadeInDown.delay(staggerDelay(5)).duration(400)} style={{ ...tile, gap: 8 }}>
                <Text style={{ ...t.typography.overline, color: t.colors.inkMuted }}>Open boxes · tap to seal</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {open.map((b) => (
                    <PressableScale key={b.id} accessibilityLabel={`Seal ${b.num}`} onPress={() => setSeal(b)} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed", borderColor: t.colors.kraft }}>
                      <Package size={14} color={t.colors.kraft} />
                      <Text style={{ ...t.typography.label, color: t.colors.ink }}>
                        #{b.num} {b.label}
                      </Text>
                    </PressableScale>
                  ))}
                </View>
              </Animated.View>
            ) : null}
          </>
        )}
      </ScrollView>
      <SetupSheet visible={setup} onClose={() => setSetup(false)} onSaved={setBurst} />
      <NewBoxSheet visible={newBox !== undefined} room={newBox ?? null} onClose={() => setNewBox(undefined)} onSaved={setBurst} />
      <SealSheet box={seal} onClose={() => setSeal(null)} onSaved={setBurst} />
      <BurstOverlay msg={burst} onDone={() => setBurst(null)} />
    </View>
  );
}
