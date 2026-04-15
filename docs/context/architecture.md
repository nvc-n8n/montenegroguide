# Architecture

## Pregled

Frontend je organizovan kao lagana feature-first Expo aplikacija:

- `app/`: Expo Router rute
- `features/`: ekrani i feature-specifične komponente
- `components/`: reusable UI building blocks
- `services/api/`: data access sloj
- `services/mappers/`: normalizacija backend/mock DTO shape-ova u UI domain modele
- `store/`: lokalno stanje i perzistencija favorita
- `mocks/`: izolovani mock JSON fixture-i
- `hooks/usePressScale.ts` i `utils/motion.ts`: lagani motion foundation za press feedback i screen/list animacije
- `theme/`, `constants/`, `utils/`, `types/`: shared foundation

## Data flow

1. Screen koristi React Query hook iz `hooks/useGuideQueries.ts`
2. Hook poziva `placesApi`
3. `placesApi` je ili `MockPlacesApi` ili `HttpPlacesApi`
4. Mapperi prevode raw DTO u UI modele
5. UI renderuje isključivo domain tipove, bez direktnog oslanjanja na `fetch` ili raw payload

## Stanje

- Remote/query state: React Query
- Lokalni favoriti: Zustand + AsyncStorage
- Kratkoročno UI stanje: lokalni component state

## Navigacija

- Tabovi: Početna, Opštine, Pretraga, Sačuvano
- Stack rute: `municipalities/[slug]`, `categories/[slug]`, `places/[slug]`
- Motion: nativni stack push + Reanimated enter/layout animacije; category ekran koristi hero-first otvaranje umjesto eksperimentalnog shared-element pristupa

## Integraciona granica prema backend-u

- `services/api/places-api.ts` je jedina ugovorna tačka koju UI poznaje
- `HttpPlacesApi` sadrži fallback logiku za parcijalno spremne backend odgovore
- Mock fixture-i prate shape definisan za mjesta, opštine i kategorije kako bi integracija kasnije bila minimalna
