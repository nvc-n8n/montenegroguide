import { CormorantGaramond_600SemiBold, CormorantGaramond_700Bold } from "@expo-google-fonts/cormorant-garamond";
import { Nunito_400Regular, Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold } from "@expo-google-fonts/nunito";
import { useFonts } from "expo-font";

export const useAppFonts = () =>
  useFonts({
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });
