import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { Package } from "lucide-react-native";
import { useTheme } from "../theme";
import { KIND_COLORS } from "../theme/colors";
import { Sheet, Field, inputStyle } from "./Sheet";
import { Chip, Stepper } from "./Bits";
import { Segmented } from "./Segmented";
import { Toggle } from "./Toggle";
import { PrimaryButton } from "./PrimaryButton";
import { SuccessBurst } from "./SuccessBurst";
import { useApp } from "../store/appStore";
import { addBox, addRoom, saveSetting, sealBox } from "../data/repo";
import { MINUTE_PRESETS, ROOM_PRESETS } from "../data/presets";
import { ESSENTIALS } from "../lib/firstnight";
import { addDays, dayLabel, weekdayLabel } from "../lib/time";
import { haptics } from "../services/haptics";
import type { Box } from "../data/repo";

const LABELS = ["Dishes", "Pots & pans", "Books", "Clothes", "Bedding", "Toiletries", "Toys", "Cables", "Decor", "Pantry", "Shoes", "Papers"];

export function NewBoxSheet({ visible, room, onClose, onSaved }: { visible: boolean; room: string | null; onClose: () => void; onSaved: (m: string) => void }) {
  const t = useTheme();
  const { rooms, today, refresh } = useApp();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [weight, setWeight] = useState<Box["weight"]>("medium");
  const [fragile, setFragile] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  useEffect(() => {
    if (!visible) return;
    setRoomId(room ?? rooms[0]?.id ?? null);
    setLabel("");
    setWeight("medium");
    setFragile(false);
    setTags([]);
  }, [visible]);
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="New box"
      subtitle="It gets the next number — write it on the box."
      footer={
        <PrimaryButton
          label="Start this box"
          disabled={!roomId}
          onPress={async () => {
            if (!roomId) return;
            const r = await addBox({ room_id: roomId, label: label.trim(), weight, fragile, tags }, today);
            await refresh();
            haptics.success();
            onClose();
            onSaved(`Box ${r.num} started`);
          }}
        />
      }
    >
      <Field label="Room">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {rooms.map((r) => (
            <Chip key={r.id} a11y={`Room ${r.name}`} label={r.name} color={KIND_COLORS[r.kind]} active={roomId === r.id} onPress={() => setRoomId(r.id)} />
          ))}
        </View>
      </Field>
      <Field label="What's inside">
        <TextInput value={label} onChangeText={setLabel} placeholder="e.g. Dishes, top shelf" placeholderTextColor={t.colors.inkFaint} style={inputStyle(t)} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
          {LABELS.map((l) => (
            <Chip key={l} a11y={`Label ${l}`} label={l} active={label === l} onPress={() => setLabel(l)} />
          ))}
        </View>
      </Field>
      <Field label="Weight">
        <Segmented items={[{ key: "light" as const, label: "Light" }, { key: "medium" as const, label: "Medium" }, { key: "heavy" as const, label: "Heavy" }]} value={weight} onChange={setWeight} />
      </Field>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ ...t.typography.label, color: t.colors.ink }}>Fragile</Text>
        <Toggle value={fragile} onValueChange={setFragile} />
      </View>
      <Field label="First-night essentials inside" hint="Tagged boxes are candidates for the first evening in the new home.">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {ESSENTIALS.map((e) => (
            <Chip key={e.key} a11y={`Tag ${e.label}`} label={e.label} active={tags.includes(e.key)} onPress={() => setTags(tags.includes(e.key) ? tags.filter((x) => x !== e.key) : [...tags, e.key])} />
          ))}
        </View>
      </Field>
    </Sheet>
  );
}

export function SealSheet({ box, onClose, onSaved }: { box: Box | null; onClose: () => void; onSaved: (m: string) => void }) {
  const t = useTheme();
  const { today, refresh } = useApp();
  const [min, setMin] = useState(30);
  useEffect(() => {
    if (box) setMin(30);
  }, [box?.id]);
  if (!box) return null;
  return (
    <Sheet
      visible
      onClose={onClose}
      title={`Seal box ${box.num}`}
      subtitle="Roughly how long did packing it take? This teaches the app your real pace."
      footer={
        <PrimaryButton
          label={`Sealed · ${min} min`}
          onPress={async () => {
            await sealBox(box.id, min, today);
            await refresh();
            haptics.success();
            onClose();
            onSaved(`Box ${box.num} sealed`);
          }}
        />
      }
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {MINUTE_PRESETS.map((m) => (
          <Chip key={m} a11y={`Minutes ${m}`} label={`${m} min`} active={min === m} onPress={() => setMin(m)} />
        ))}
      </View>
      <Stepper value={min} onChange={setMin} step={5} min={5} max={240} format={(v) => `${v} min`} />
      <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>Include wrapping and finding tape — the plan uses these minutes for everything still to pack.</Text>
    </Sheet>
  );
}

// Первый запуск: дата переезда и комнаты одним экраном.
export function SetupSheet({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: (m: string) => void }) {
  const t = useTheme();
  const { today, rooms, refresh } = useApp();
  const [days, setDays] = useState(14);
  const [picked, setPicked] = useState<string[]>(["Kitchen", "Bathroom", "Bedroom", "Living room"]);
  useEffect(() => {
    if (visible) setDays(14);
  }, [visible]);
  const move = addDays(today, days);
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Set up your move"
      subtitle="Change anything later in Settings."
      footer={
        <PrimaryButton
          label="Start packing plan"
          disabled={picked.length === 0}
          onPress={async () => {
            await saveSetting("moveDay", move);
            const have = new Set(rooms.map((r) => r.name));
            for (const p of ROOM_PRESETS) if (picked.includes(p.name) && !have.has(p.name)) await addRoom(p.name, p.kind, p.est, p.window);
            await refresh();
            haptics.success();
            onClose();
            onSaved("Plan ready");
          }}
        />
      }
    >
      <Field label="Moving day" hint={`${weekdayLabel(move)}, ${dayLabel(move)}`}>
        <Stepper value={days} onChange={setDays} min={1} max={90} format={(v) => `in ${v} days`} />
      </Field>
      <Field label="Rooms to pack" hint="Each comes with a typical box count and how long you keep using it.">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {ROOM_PRESETS.map((p) => (
            <Chip key={p.name} a11y={`Setup ${p.name}`} label={p.name} color={KIND_COLORS[p.kind]} active={picked.includes(p.name)} onPress={() => setPicked(picked.includes(p.name) ? picked.filter((x) => x !== p.name) : [...picked, p.name])} />
          ))}
        </View>
      </Field>
    </Sheet>
  );
}

export function BurstOverlay({ msg, onDone }: { msg: string | null; onDone: () => void }) {
  const t = useTheme();
  if (!msg) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center", zIndex: 80, elevation: 80 }}>
      <Animated.View entering={ZoomIn.duration(220)} style={{ backgroundColor: t.colors.surface, borderRadius: 24, paddingVertical: 20, paddingHorizontal: 28, alignItems: "center", gap: 8, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 }}>
        <SuccessBurst visible size={72} onDone={() => setTimeout(onDone, 650)} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Package size={16} color={t.colors.accent} />
          <Text style={{ ...t.typography.label, color: t.colors.ink }}>{msg}</Text>
        </View>
      </Animated.View>
    </View>
  );
}
