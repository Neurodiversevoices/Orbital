import {
  Modal,
  View,
  TextInput,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  Keyboard,
} from "react-native";
import { useState, useMemo } from "react";
import { allCommands, fuzzyMatch, Command } from "../lib/commands/registry";
import { useCommandPalette } from "../hooks/useCommandPalette";

export const CommandPalette = () => {
  const { open, hide } = useCommandPalette();
  const [query, setQuery] = useState("");

  const ranked = useMemo(() => {
    return allCommands()
      .map((cmd) => ({ cmd, score: fuzzyMatch(query, cmd) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }, [query]);

  const run = async (cmd: Command) => {
    Keyboard.dismiss();
    hide();
    setQuery("");
    await cmd.run();
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={hide}>
      <Pressable style={styles.backdrop} onPress={hide}>
        <Pressable style={styles.palette} onPress={(e) => e.stopPropagation()}>
          <TextInput
            style={styles.input}
            placeholder="Search commands..."
            placeholderTextColor="#888"
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          <FlatList
            data={ranked}
            keyExtractor={(item) => item.cmd.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable style={styles.row} onPress={() => run(item.cmd)}>
                <Text style={styles.icon}>{item.cmd.icon || "•"}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{item.cmd.label}</Text>
                  {item.cmd.hint && <Text style={styles.hint}>{item.cmd.hint}</Text>}
                </View>
                {item.cmd.group && <Text style={styles.group}>{item.cmd.group}</Text>}
              </Pressable>
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-start",
    paddingTop: 80,
  },
  palette: {
    backgroundColor: "rgba(20,22,28,0.97)",
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    maxHeight: 480,
  },
  input: {
    color: "#F8F4E9",
    fontSize: 16,
    padding: 16,
    fontFamily: "DM Sans",
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  row: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  icon: { fontSize: 18, width: 24, textAlign: "center" },
  label: { color: "#F8F4E9", fontSize: 15, fontFamily: "DM Sans" },
  hint: { color: "#888", fontSize: 12, fontFamily: "Space Mono", marginTop: 2 },
  group: {
    color: "#2DD4BF",
    fontSize: 11,
    fontFamily: "Space Mono",
    letterSpacing: 1,
  },
});
