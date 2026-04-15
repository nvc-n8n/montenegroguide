import { Linking, Platform } from "react-native";

import type { Place } from "@/types/domain";

const buildFallbackUrl = (place: Place) => {
  if (!place.coordinates) {
    return null;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${place.coordinates.lat},${place.coordinates.lng}`;
};

export const openDirections = async (place: Place) => {
  if (!place.coordinates) {
    return false;
  }

  const encodedName = encodeURIComponent(place.name);
  const { lat, lng } = place.coordinates;

  const nativeUrl =
    Platform.OS === "ios"
      ? `http://maps.apple.com/?daddr=${lat},${lng}&q=${encodedName}`
      : `geo:0,0?q=${lat},${lng}(${encodedName})`;

  const fallbackUrl = buildFallbackUrl(place);
  const canOpenNative = await Linking.canOpenURL(nativeUrl);

  if (canOpenNative) {
    await Linking.openURL(nativeUrl);
    return true;
  }

  if (fallbackUrl) {
    await Linking.openURL(fallbackUrl);
    return true;
  }

  return false;
};
