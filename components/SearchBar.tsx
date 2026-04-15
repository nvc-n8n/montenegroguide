import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import { useTranslation } from "react-i18next";

import { usePressScale } from "@/hooks/usePressScale";
import { colors, shadows, spacing, typography } from "@/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface SearchBarProps {
  value?: string;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  editable?: boolean;
  onPress?: () => void;
  onSubmit?: () => void;
}

export const SearchBar = ({
  value,
  onChangeText,
  placeholder,
  editable = true,
  onPress,
  onSubmit,
}: SearchBarProps) => {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t("search_placeholder");
  const buttonLabel = t("search_button") ?? "Pretraži";
  const { animatedStyle, onPressIn, onPressOut } = usePressScale(0.94);

  const content = (
    <View style={styles.container}>
      <View style={styles.leftIcon}>
        <MaterialCommunityIcons color={colors.textSoft} name="magnify" size={20} />
      </View>
      <View style={styles.textWrap}>
        {editable ? (
          <TextInput
            accessibilityLabel={resolvedPlaceholder}
            onChangeText={onChangeText}
            onSubmitEditing={onSubmit}
            placeholder={resolvedPlaceholder}
            placeholderTextColor={colors.textSoft}
            returnKeyType="search"
            style={styles.input}
            value={value}
          />
        ) : (
          <Text numberOfLines={1} style={[styles.input, !value ? styles.placeholder : null]}>
            {value || resolvedPlaceholder}
          </Text>
        )}
      </View>
      <AnimatedPressable
        accessibilityLabel={buttonLabel}
        accessibilityRole="button"
        onPress={onSubmit ?? onPress}
        onPressIn={() => onPressIn()}
        onPressOut={() => onPressOut()}
        style={[styles.submitButton, animatedStyle]}
      >
        <MaterialCommunityIcons color={colors.card} name="magnify" size={20} />
      </AnimatedPressable>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable accessibilityRole="search" onPress={onPress}>
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    ...shadows.card,
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 58,
    paddingLeft: 20,
    paddingRight: 6,
    paddingVertical: 6,
  },
  leftIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
  },
  input: {
    color: colors.text,
    fontFamily: typography.sans.medium,
    fontSize: 15,
    paddingVertical: 4,
  },
  placeholder: {
    color: colors.textSoft,
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 46,
    justifyContent: "center",
    width: 46,
    ...shadows.soft,
  },
});
