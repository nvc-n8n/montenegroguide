import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { colors, spacing, typography } from "@/theme";

interface Option {
  id: string;
  label: string;
}

interface FilterChipRowProps {
  options: Option[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

export const FilterChipRow = ({ options, selectedIds, onToggle }: FilterChipRowProps) => (
  <ScrollView contentContainerStyle={styles.container} horizontal showsHorizontalScrollIndicator={false}>
    {options.map((option) => {
      const selected = selectedIds.includes(option.id);
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected }}
          key={option.id}
          onPress={() => onToggle(option.id)}
          style={[styles.chip, selected ? styles.selectedChip : null]}
        >
          <Text style={[styles.label, selected ? styles.selectedLabel : null]}>{option.label}</Text>
        </Pressable>
      );
    })}
  </ScrollView>
);

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  chip: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  selectedChip: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  label: {
    color: colors.text,
    fontFamily: typography.sans.medium,
    fontSize: 14,
  },
  selectedLabel: {
    color: colors.card,
  },
});
