import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertTriangle, CheckCircle2, Moon } from "lucide-react-native";
import { useTheme } from "../../src/theme";
import { KIND_COLORS } from "../../src/theme/colors";
import { staggerDelay } from "../../src/theme/motion";
import { useApp } from "../../src/store/appStore";
import { hm, useMove } from "../../src/ui/derive";
import { PressableScale } from "../../src/components/PressableScale";
import { Segmented } from "../../src/components/Segmented";
import { Chip, Stepper } from "../../src/components/Bits";
import { CoverageWheel, RoomStrip } from "../../src/components/Widgets";
import { saveSetting } from "../../src/data/repo";
import { remedies } from "../../src/lib/packplan";
import { ESSENTIALS } from "../../src/lib/firstnight";
import { addDays, weekdayLabel } from "../../src/lib/time";
import { pct, plural } from "../../src/ui/format";
import { haptics } from "../../src/services/haptics";

type Tab = "pack" | "night" | "whatif";

export default function PlanTab() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { rooms, boxes, today, settings, extra, wanted, refresh } = useApp();
  const m = useMove();
  const [tab, setTab] = useState<Tab>("pack");
  useEffect(() => {
    if (params.tab === "night") setTab("night");
  }, [params.tab]);
  const [room, setRoom] = useState<string | null>(null);
  const [cat, setCat] = useState<string | null>(null);
  const p = m.plan;
  const fx = useMemo(() => (tab === "pack" ? remedies(m.work, m.caps, m.days, p, m.dayName, m.isWeekend) : []), [tab, m]);

  const [shift, setShift] = useState(0);
  const [wd, setWd] = useState(settings.weekdayMin);
  const [we, setWe] = useState(settings.weekendMin);
  const [helper, setHelper] = useState<number | null>(null);
  // Вкладки не пересоздаются — исходные значения what-if подтягиваем из настроек при их смене.
  useEffect(() => {
    setWd(settings.weekdayMin);
    setWe(settings.weekendMin);
  }, [settings.weekdayMin, settings.weekendMin]);
  const alt = useMemo(() => (tab === "whatif" ? m.build({ moveShift: shift, weekdayMin: wd, weekendMin: we, helperDay: helper }) : null), [tab, shift, wd, we, helper, m]);
  const weekendDays = Array.from({ length: m.days }, (_, d) => d).filter((d) => m.isWeekend(d)).slice(0, 4);

  const selRoom = room ? m.roomById.get(room) : null;
  const catLabel = (k: string) => ESSENTIALS.find((e) => e.key === k)?.label ?? k;
  const boxesWith = (k: string) => boxes.filter((b) => m.boxTags(b).includes(k));
  const col = (label: string, a: string, b: string, better: boolean | null) => (
    <View key={label} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 9, borderTopWidth: 1, borderTopColor: t.colors.border }}>
      <Text style={{ ...t.typography.caption, color: t.colors.inkMuted, flex: 1.3 }}>{label}</Text>
      <Text style={{ ...t.typography.label, color: t.colors.ink, flex: 1, textAlign: "center" }}>{a}</Text>
      <Text style={{ ...t.typography.label, flex: 1, textAlign: "center", color: better === null ? t.colors.ink : better ? t.colors.teal : t.colors.danger }}>{b}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
        <Text style={{ ...t.typography.title, color: t.colors.ink }}>Plan</Text>
        <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>
          {plural(m.days, "day")} to pack · {pct(p.pOnTime)} chance to be ready
        </Text>
      </View>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <Segmented items={[{ key: "pack" as Tab, label: "Packing", badge: p.late > 0 ? 1 : undefined }, { key: "night" as Tab, label: "First night" }, { key: "whatif" as Tab, label: "What if" }]} value={tab} onChange={setTab} />
      </View>

      {tab === "pack" ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 30 }}>
          <Animated.View entering={FadeInDown.duration(400)} style={{ backgroundColor: t.colors.surface, borderRadius: 22, padding: 14, gap: 10 }}>
            <RoomStrip rooms={rooms.map((r) => ({ id: r.id, name: r.name, kind: r.kind, window: r.window_days }))} chunks={p.chunks} days={m.days} dayLabel={(d) => weekdayLabel(addDays(today, d))} selected={room} onSelect={setRoom} />
            {selRoom ? (
              <View style={{ backgroundColor: t.colors.surfaceAlt, borderRadius: 14, padding: 12, gap: 4 }}>
                <Text style={{ ...t.typography.label, color: t.colors.ink }}>
                  {selRoom.name}: {plural(m.remaining[selRoom.id], "box")} left · {Math.round(m.paceOf[selRoom.id].minutes)} min each
                </Text>
                <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>
                  You use it until {selRoom.window_days <= 1 ? "the last evening" : `${plural(selRoom.window_days, "day")} before the move`}; shaded columns are that window. {m.paceOf[selRoom.id].n > 0 ? `Pace learned from ${m.paceOf[selRoom.id].n.toFixed(1)} weighted boxes.` : "Pace is a starting guess until you seal boxes here."}
                </Text>
                {p.chunks.filter((c) => c.room === selRoom.id).map((c) => (
                  <Text key={c.day} style={{ ...t.typography.caption, color: c.early ? t.colors.amber : t.colors.ink }}>
                    {m.dayName(c.day)}: {hm(c.minutes)}{c.early ? " (before its window)" : ""}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={{ ...t.typography.caption, color: t.colors.inkFaint, textAlign: "center" }}>Tap a room · pale bars = packing a room you still use</Text>
            )}
          </Animated.View>

          {p.late > 0 || p.pOnTime < 0.8 ? (
            <Animated.View entering={FadeInDown.delay(staggerDelay(1)).duration(400)} style={{ backgroundColor: t.colors.surface, borderRadius: 22, padding: 16, gap: 8, borderWidth: 1.5, borderColor: p.late > 0 ? t.colors.accent : t.colors.amber }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <AlertTriangle size={16} color={p.late > 0 ? t.colors.accent : t.colors.amber} />
                <Text style={{ ...t.typography.label, fontSize: 15, color: t.colors.ink, flex: 1 }}>{p.late > 0 ? `${hm(p.late)} won't fit before the move` : `Tight: ${pct(p.pOnTime)} chance`}</Text>
              </View>
              <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>
                {hm(p.total)} of packing left (± {hm(p.sd)} — boxes vary) against {hm(p.capacity)} you've set aside.
                {p.late > 0 ? ` Left over: ${Object.entries(p.lateByRoom).map(([id, v]) => `${m.roomById.get(id)?.name} ${hm(v)}`).join(", ")}.` : ""}
              </Text>
              {fx.map((r, k) => (
                <View key={r.label} style={{ backgroundColor: t.colors.surfaceAlt, borderRadius: 14, padding: 10, gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ ...t.typography.label, color: t.colors.ink, flex: 1 }}>
                      {k + 1}. {r.label}
                    </Text>
                    <Text style={{ ...t.typography.label, color: r.plan.late === 0 ? t.colors.teal : t.colors.amber }}>{pct(r.plan.pOnTime)}</Text>
                  </View>
                  <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>
                    {r.detail} {r.plan.late === 0 ? "Everything fits." : `${hm(r.plan.late)} still left over.`}
                  </Text>
                  <PressableScale
                    accessibilityLabel={`Apply ${r.label}`}
                    onPress={async () => {
                      haptics.tap();
                      for (const e of r.extra) {
                        const date = addDays(today, e.day);
                        await saveSetting(`extra:${date}`, String((extra[date] ?? 0) + e.minutes));
                      }
                      await refresh();
                    }}
                    style={{ alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: t.colors.accentSoft }}
                  >
                    <Text style={{ ...t.typography.label, color: t.colors.accent }}>Add to my plan</Text>
                  </PressableScale>
                </View>
              ))}
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.delay(staggerDelay(1)).duration(400)} style={{ backgroundColor: t.colors.tealSoft, borderRadius: 22, padding: 14, flexDirection: "row", gap: 10, alignItems: "center" }}>
              <CheckCircle2 size={18} color={t.colors.teal} />
              <Text style={{ ...t.typography.caption, color: t.colors.ink, flex: 1 }}>On track. {p.early > 0 ? `${hm(p.early)} has to happen before you're done with a room.` : "Every room gets packed inside its window."}</Text>
            </Animated.View>
          )}

          {m.caps.slice(0, 7).map((c, i) => {
            const chunks = p.chunks.filter((x) => x.day === c.day);
            const used = chunks.reduce((s, x) => s + x.minutes, 0);
            return (
              <Animated.View key={c.day} entering={FadeInDown.delay(staggerDelay(i + 2)).duration(350)} style={{ backgroundColor: t.colors.surface, borderRadius: 18, padding: 14, gap: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ ...t.typography.label, fontSize: 15, color: t.colors.ink, flex: 1 }}>{c.day === 0 ? "Today" : m.dayName(c.day)}</Text>
                  <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>
                    {hm(used)} of {hm(c.minutes)}
                  </Text>
                </View>
                {chunks.length === 0 ? <Text style={{ ...t.typography.caption, color: t.colors.inkFaint }}>Free</Text> : null}
                {chunks.map((x) => (
                  <View key={x.room} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: KIND_COLORS[m.roomById.get(x.room)?.kind ?? "storage"] }} />
                    <Text style={{ ...t.typography.caption, color: t.colors.ink, flex: 1 }}>{m.roomById.get(x.room)?.name}</Text>
                    <Text style={{ ...t.typography.caption, color: x.early ? t.colors.amber : t.colors.inkMuted }}>{hm(x.minutes)}</Text>
                  </View>
                ))}
              </Animated.View>
            );
          })}
        </ScrollView>
      ) : null}

      {tab === "night" ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 30 }}>
          <Animated.View entering={FadeInDown.duration(400)} style={{ backgroundColor: t.colors.surface, borderRadius: 22, padding: 16, gap: 12 }}>
            <CoverageWheel
              wanted={wanted}
              covered={m.night.covered}
              selected={cat}
              onSelect={setCat}
              size={210}
              center={
                cat ? (
                  <Text numberOfLines={2} style={{ ...t.typography.label, color: t.colors.ink, textAlign: "center" }}>{catLabel(cat)}</Text>
                ) : (
                  <>
                    <Moon size={18} color={t.colors.teal} />
                    <Text style={{ fontSize: 22, fontWeight: "800", color: t.colors.ink }}>{m.night.max ? pct(m.night.score / m.night.max) : "—"}</Text>
                  </>
                )
              }
            />
            {cat ? (
              <Text style={{ ...t.typography.caption, color: t.colors.inkMuted, textAlign: "center" }}>
                {boxesWith(cat).length ? `In ${boxesWith(cat).map((b) => `#${b.num}${b.status === "open" ? " (still open)" : ""}`).join(", ")}.` : "Not in any box yet — tag a box with it when you pack it."}
                {m.night.covered.includes(cat) ? " Covered by the plan." : boxesWith(cat).some((b) => b.status === "sealed") ? " Left out: opening that box doesn't fit the evening." : ""}
              </Text>
            ) : (
              <Text style={{ ...t.typography.caption, color: t.colors.inkFaint, textAlign: "center" }}>Tap a slice to see where it is</Text>
            )}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ ...t.typography.label, color: t.colors.ink }}>First evening for unpacking</Text>
              <Stepper value={settings.nightMin} step={15} min={15} max={300} format={(v) => hm(v)} onChange={async (v) => { await saveSetting("nightMin", String(v)); await refresh(); }} />
            </View>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(staggerDelay(1)).duration(400)} style={{ backgroundColor: t.colors.surface, borderRadius: 22, padding: 16, gap: 8 }}>
            <Text style={{ ...t.typography.overline, color: t.colors.inkMuted }}>Open these first · load them last</Text>
            {m.night.open.length === 0 ? <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>Seal boxes tagged with first-night things and they'll show up here.</Text> : null}
            {m.night.open.map((id, i) => {
              const b = boxes.find((x) => x.id === id)!;
              return (
                <View key={id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={{ ...t.typography.label, color: t.colors.teal, width: 18 }}>{i + 1}</Text>
                  <Text style={{ ...t.typography.body, color: t.colors.ink, flex: 1 }}>
                    #{b.num} {b.label}
                  </Text>
                  <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>{m.boxTags(b).filter((x) => wanted.includes(x)).map(catLabel).join(", ")}</Text>
                </View>
              );
            })}
            <Text style={{ ...t.typography.caption, color: t.colors.inkFaint }}>
              {hm(m.night.minutes)} of {hm(settings.nightMin)} to open. {m.night.exact ? "Best mix checked across every combination of tagged boxes." : ""}
            </Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(staggerDelay(2)).duration(400)} style={{ backgroundColor: t.colors.surface, borderRadius: 22, padding: 16, gap: 8 }}>
            <Text style={{ ...t.typography.overline, color: t.colors.inkMuted }}>What you need that night</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {ESSENTIALS.map((e) => (
                <Chip key={e.key} a11y={`Want ${e.label}`} label={e.label} active={wanted.includes(e.key)} onPress={async () => { await saveSetting("wanted", JSON.stringify(wanted.includes(e.key) ? wanted.filter((x) => x !== e.key) : [...wanted, e.key])); await refresh(); }} />
              ))}
            </View>
          </Animated.View>
        </ScrollView>
      ) : null}

      {tab === "whatif" && alt ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 30 }}>
          <Animated.View entering={FadeInDown.duration(400)} style={{ backgroundColor: t.colors.surface, borderRadius: 22, padding: 16, gap: 12 }}>
            {[
              ["Move date", <Stepper key="s" value={shift} onChange={setShift} min={-m.days + 1} max={21} format={(v) => (v === 0 ? "as planned" : `${v > 0 ? "+" : "−"}${Math.abs(v)} d`)} />],
              ["Weekday packing", <Stepper key="w" value={wd} onChange={setWd} step={30} min={0} max={480} format={(v) => hm(v)} />],
              ["Weekend packing", <Stepper key="e" value={we} onChange={setWe} step={30} min={0} max={600} format={(v) => hm(v)} />],
            ].map(([l, c]) => (
              <View key={l as string} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ ...t.typography.label, color: t.colors.ink }}>{l}</Text>
                {c}
              </View>
            ))}
            <Text style={{ ...t.typography.overline, color: t.colors.inkMuted }}>A friend helps 4 hours on</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Chip label="Nobody" active={helper === null} onPress={() => setHelper(null)} />
              {weekendDays.map((d) => (
                <Chip key={d} a11y={`Helper ${m.dayName(d)}`} label={m.dayName(d)} active={helper === d} onPress={() => setHelper(d)} />
              ))}
            </View>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(staggerDelay(1)).duration(400)} style={{ backgroundColor: t.colors.surface, borderRadius: 22, padding: 16 }}>
            <View style={{ flexDirection: "row", paddingBottom: 6 }}>
              <Text style={{ flex: 1.3 }} />
              <Text style={{ ...t.typography.overline, color: t.colors.inkMuted, flex: 1, textAlign: "center" }}>Now</Text>
              <Text style={{ ...t.typography.overline, color: t.colors.accent, flex: 1, textAlign: "center" }}>What if</Text>
            </View>
            {col("Chance to be ready", pct(p.pOnTime), pct(alt.plan.pOnTime), Math.abs(alt.plan.pOnTime - p.pOnTime) < 0.005 ? null : alt.plan.pOnTime > p.pOnTime)}
            {col("Won't fit", hm(p.late), hm(alt.plan.late), alt.plan.late === p.late ? null : alt.plan.late < p.late)}
            {col("Packing time set aside", hm(p.capacity), hm(alt.plan.capacity), null)}
            {col("Rooms packed early", hm(p.early), hm(alt.plan.early), Math.abs(alt.plan.early - p.early) < 1 ? null : alt.plan.early < p.early)}
            <Text style={{ ...t.typography.caption, color: t.colors.inkFaint, marginTop: 6 }}>"Packed early" is time spent packing a room you'd still be using.</Text>
          </Animated.View>
        </ScrollView>
      ) : null}
    </View>
  );
}
