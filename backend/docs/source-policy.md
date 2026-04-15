# Source Policy

## Allowed Sources

### Primary Sources
| Source | URL | License/Policy | Data Used For |
|---|---|---|---|
| JP Morsko Dobro | morskodobro.me | Government public information | Beaches, bathing areas |
| Herceg Novi Tourism | hercegnovi.travel | Official tourism promotion | All POI categories |
| Kotor Tourism | kotor.travel | Official tourism promotion | All POI categories |
| Tivat Tourism | tivat.travel | Official tourism promotion | All POI categories |
| Budva Tourism | budva.travel | Official tourism promotion | All POI categories |
| Bar Tourism | bar.travel | Official tourism promotion | All POI categories |
| Ulcinj Tourism | ulcinj.travel | Official tourism promotion | All POI categories |
| Montenegro Travel | montenegro.travel | National tourism authority | Enrichment, national POIs |

### Secondary Sources
| Source | URL | License | Data Used For |
|---|---|---|---|
| OpenStreetMap | openstreetmap.org | ODbL 1.0 | Coordinates, geo enrichment |
| Wikidata | wikidata.org | CC0 | Alternate names, multilingual |

## Blocked Sources

| Source | Reason |
|---|---|
| TripAdvisor | Terms of Service prohibit scraping |
| Google Maps / Google Places | Not to be used as source of truth; licensing restrictions |
| Booking.com | Terms of Service prohibit scraping |
| Airbnb | Terms of Service prohibit scraping |

## Image Handling Rules

### License Status Values
- `approved` - Image usage is clearly permitted (open license, explicit permission)
- `needs_review` - Source allows public display but license is unclear; human review needed before production use
- `unknown` - No license information available
- `blocked` - Image must not be used (copyright restricted, explicit prohibition)

### Image Source Rules
1. **Government/official tourism sources**: Store metadata, mark as `needs_review`. These are publicly-promoted images but formal licensing may not be stated.
2. **Wikimedia Commons images** (via Wikidata): Store metadata, mark as `needs_review`. Most are CC-licensed but individual verification is needed.
3. **OpenStreetMap**: OSM does not serve images directly. No image ingestion from OSM.
4. **User-submitted**: Not applicable for initial ingestion.

### Image Storage Rules
- Always store the metadata record (original_url, source_page_url, credit, license info) even if the image itself cannot be downloaded or stored
- Only download and store the actual image file when:
  - The source is an official tourism/government site
  - Or the image has a known open license
- If license is unclear: store metadata + original_url, set `license_status = "needs_review"`
- Never download from blocked sources
- Deduplicate by SHA256 hash to avoid storing the same image multiple times

### Attribution
- Always preserve `credit` and `license_label` fields
- Always store `source_page_url` for provenance
- When displaying images, the frontend should show credit when available

## Rate Limiting & Politeness
- Minimum 1-second delay between requests to the same domain
- 2-second delay between batches
- User-Agent header identifies the tool: `MontenegroGuide/1.0`
- Respect robots.txt where applicable
- Do not make excessive requests during peak hours
