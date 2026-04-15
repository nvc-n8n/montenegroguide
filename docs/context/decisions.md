# Decisions

## 2026-04-07 - Expo Router u rootu, backend ostaje netaknut

Frontend je smješten u root projekta, a postojeći backend ostaje u `backend/`. Ovo smanjuje rizik od miješanja slojeva i omogućava da mobilni tim radi nezavisno od serverskog.

## 2026-04-07 - Jedinstven API interfejs sa mock/real zamjenom

Sav UI koristi `PlacesApi`. `MockPlacesApi` omogućava trenutni razvoj bez backend-a, a `HttpPlacesApi` omogućava kasniju integraciju bez prepravke ekrana. ROI je visok jer uklanja blokere i smanjuje kasniji refactor.

## 2026-04-07 - Lokalni favoriti ostaju na uređaju

Favoriti su implementirani lokalno preko Zustand + AsyncStorage. To je najbrže i najstabilnije rješenje za prvu verziju aplikacije, bez zavisnosti od auth ili backend sync mehanizama.

## 2026-04-07 - Ručna AsyncStorage perzistencija umjesto Zustand middleware-a

Zustand middleware ESM build uvodi `import.meta` u Expo web dev bundle i ruši browser preview. Zbog toga je zadržan jednostavan Zustand store sa ručnom AsyncStorage hidratacijom, što je stabilnije za Expo web i i dalje dovoljno lagano za ovu fazu proizvoda.

## 2026-04-07 - Map preview blok umjesto teškog embedded mapa stacka

Prioritet je bio pouzdano `Otvori rutu` iskustvo preko nativnog deep linka. Ugrađene mape su svjesno ostavljene van prve verzije da bismo smanjili složenost i rizik, uz očuvan korisnički cilj.

## 2026-04-07 - Premium editorial vizuelni pravac

Izabran je topao editorial travel UI sa serif naslovima, Manrope body tipografijom, mekim karticama i tonalitetom mora/pijeska. Cilj je da aplikacija izgleda kao consumer travel proizvod, a ne kao direktorijum ili admin alat.

## 2026-04-07 - Kategorije prelaze na image-led editorial mosaic

Jednostavan dvo-kolonski grid nije imao dovoljno premium karaktera. Zamijenjen je asimetričnim mosaic rasporedom sa velikim fotografijama, overlay copy-jem i category highlightom, uz fallback covere kada backend ne vrati slike za pojedinu kategoriju.

## 2026-04-07 - Motion UX preko stabilnog Reanimated sloja, bez oslanjanja na eksperimentalni shared-element API

Zvanična dokumentacija potvrđuje da shared-element tranzicije postoje (`sharedTransitionTag`), ali su i dalje eksperimentalne i nepouzdane u tab-based Expo Router toku koji ova aplikacija koristi. Umjesto rizičnog oslanjanja na to, uveden je stabilniji motion sistem: enter animacije, press scale feedback, layout tranzicije i image-led hero otvaranje category ekrana. Time dobijamo premium osjećaj kretanja bez vezivanja za funkcionalnost koja može da pukne na web-u, u Expo Go okruženju ili kroz tab navigaciju.
