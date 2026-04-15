# Worklog

## 2026-04-07

- Postavljen novi Expo Router + TypeScript frontend u root folder projekta
- Dodate zavisnosti za React Query, Zustand, AsyncStorage, Expo Image, Expo Router, custom fontove i native linking
- Implementiran `PlacesApi` interfejs sa `MockPlacesApi` i `HttpPlacesApi`
- Napravljeni mock JSON fixture-i za 6 opština, kategorije i realistična mjesta
- Izgrađeni ekrani: Home, Opštine hub, Opština detalj, Kategorija, Pretraga, Favoriti, Place detalj
- Dodati reusable UI elementi: kartice, chipovi, image fallback, error/empty/skeleton stanja, map preview
- Dodato lokalno čuvanje favorita preko Zustand + AsyncStorage
- Verifikacija prošla: `npm run typecheck` i `npx expo export --platform web`
- Ispravljena web runtime greška `Cannot use 'import.meta' outside a module` prelaskom sa Zustand middleware perzistencije na ručnu AsyncStorage hidrataciju store-a
- Redizajnirana home kategorija sekcija u asimetričan image-led editorial grid sa cover fotografijama iz API mjesta i high-quality fallback coverima
- Dodata normalizacija relativnih backend media URL-ova kako bi frontend mogao da prikaže stvarne slike kada API vrati `/media/...` putanje
- Dodatno ispoliran copy u category mosaic sekciji: uklonjeni placeholder tonovi i generičke formule, uveden kraći editorial tekst koji bolje staje u layout
- Uveden lagani Reanimated motion layer za premium UX: press scale feedback, section enter animacije, layout tranzicije i bogatiji screen flow
- Category ekran redizajniran u image-led hero layout kako bi otvaranje iz home mosaica djelovalo kao prirodan nastavak odabrane kartice
- Usklađene Expo zavisnosti za motion stack i AsyncStorage (`react-native-reanimated`, `react-native-worklets`, `@react-native-async-storage/async-storage@2.2.0`)
- Ponovo verifikovano: `npm run typecheck`, `npx expo export --platform web`, lokalni web preview na `http://localhost:8081`
