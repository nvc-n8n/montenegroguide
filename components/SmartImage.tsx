import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { PropsWithChildren, useState } from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { colors, radius, typography } from "@/theme";

interface SmartImageProps extends PropsWithChildren {
  uri?: string;
  thumbUri?: string;
  alt?: string;
  style?: StyleProp<ViewStyle>;
  contentFit?: "cover" | "contain";
}

export const SmartImage = ({ uri, thumbUri, alt, style, contentFit = "cover", children }: SmartImageProps) => {
  const [hasError, setHasError] = useState(!uri);

  return (
    <View style={[styles.container, style]}>
      {!hasError && uri ? (
        <ExpoImage
          accessibilityLabel={alt}
          style={StyleSheet.absoluteFillObject}
          source={{ uri }}
          placeholder={thumbUri ? { uri: thumbUri } : undefined}
          placeholderContentFit={contentFit}
          contentFit={contentFit}
          transition={260}
          cachePolicy="disk"
          recyclingKey={uri}
          onError={() => setHasError(true)}
        />
      ) : (
        <View style={styles.placeholder}>
          <MaterialCommunityIcons color={colors.textSoft} name="image-off-outline" size={28} />
          {alt ? <Text style={styles.placeholderText}>{alt}</Text> : null}
        </View>
      )}

      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    backgroundColor: colors.cardMuted,
    borderRadius: radius.lg,
    position: "relative",
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: colors.cardMuted,
    gap: 8,
    justifyContent: "center",
    padding: 16,
  },
  placeholderText: {
    color: colors.textSoft,
    fontFamily: typography.sans.medium,
    fontSize: 12,
    textAlign: "center",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: colors.overlayLoading,
    justifyContent: "center",
  },
});
