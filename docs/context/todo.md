# Todo

## Sljedeći potezi

- Povezati `HttpPlacesApi` na finalni backend odgovor i potvrditi shape za `/featured`
- Dobiti stvarno dostupan backend base URL ili podignut lokalni API na `localhost:8000`, jer iz trenutnog okruženja ni API ni Postgres nijesu dostupni
- Kada backend bude dostupan, provjeriti da hero coveri kategorija i screen motion rade sa realnim slikama i stvarnim response vremenima
- Dodati testove za API mappere i favorite store
- Dodati EAS/app config detalje za produkcioni build i ikone/brending assete
- Uvesti analitiku za pretragu, klik na mjesto i favorite
- Dodati finiji offline cache za posljednje pregledane rezultate ako to backend tim podrži
- Ako budemo išli na potpuno “image-origin zoom” efekat na native-u, evaluirati to tek kroz custom dev build ili noviji Expo/iOS stack, ne kroz trenutni tab flow

## Rizici za pratiti

- Backend može vratiti drugačiji `/featured` payload od pretpostavljenog
- Remote image URL-jevi u mock modu služe za razvoj i treba ih zamijeniti finalnim asset pipeline-om kada backend bude spreman
- Web export prolazi, ali finalni QA mora biti odrađen i na realnim iOS/Android uređajima
