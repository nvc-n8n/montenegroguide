# Montenegro Coast City Guide Frontend

Premium Expo React Native frontend za mobilni vodič kroz 6 crnogorskih primorskih opština:

- Herceg Novi
- Kotor
- Tivat
- Budva
- Bar
- Ulcinj

UI je kompletno na crnogorskom / srpskom latinici. Backend nije dio ovog sloja i nije mijenjan; postojeći serverski kod ostaje u folderu [`backend/`](./backend).

## Stack

- Expo
- React Native
- TypeScript
- Expo Router
- React Query
- Zustand
- AsyncStorage
- Expo Image
- Native maps deep linking

## Šta je urađeno

- Početna sa izdvojenom opštinom, pretragom, gridom kategorija i horizontalnim editorial sekcijama
- Hub za opštine i zaseban ekran za svaku opštinu
- Pregled po kategorijama
- Globalna pretraga sa instant rezultatima i kombinovanim filterima
- Detalj mjesta sa galerijom, tagovima, sadržajima, map preview blokom, nearby sekcijom i sticky akcijama
- Lokalni favoriti sa perzistencijom između pokretanja aplikacije
- Čist API sloj sa `PlacesApi` interfejsom, `MockPlacesApi` i `HttpPlacesApi`
- Mock dataset izdvojen u `mocks/data/*.json`

## Pokretanje

```bash
npm install
npm run start
```

Korisni skriptovi:

```bash
npm run typecheck
npm run web
```

## Mock i real API režim

Frontend koristi centralni config u [`constants/app-config.ts`](./constants/app-config.ts).

Kopiraj `.env.example` u `.env` i podesi:

```bash
EXPO_PUBLIC_USE_MOCK_API=true
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

Režimi:

- `EXPO_PUBLIC_USE_MOCK_API=true`: aplikacija koristi lokalni mock sloj i može odmah da se pokrene bez backend-a
- `EXPO_PUBLIC_USE_MOCK_API=false`: aplikacija koristi `HttpPlacesApi` i gađa realni backend preko `EXPO_PUBLIC_API_BASE_URL`

UI komponente nikada ne zovu `fetch` direktno; svi podaci idu kroz `services/api`.

## Struktura

```text
app/
components/
features/
services/
  api/
  mappers/
hooks/
store/
types/
constants/
theme/
utils/
mocks/
docs/context/
```

## Napomene za backend integraciju

- `MockPlacesApi` i `HttpPlacesApi` imaju isti interfejs
- Mapperi tolerantuju male razlike između mock kontrakta i postojećih backend shape-ova
- `/featured` u HTTP sloju ima fallback logiku ako backend vrati drugačiji payload ili još nije spreman
- Favoriti ostaju lokalni i nijesu vezani za backend

## Verifikacija

Odrađeno:

- `npm run typecheck`
- `npx expo export --platform web`
