// Holiday territories managed by the official API (calendrier.api.gouv.fr).
// The pure computation module arrives in phase 4 (lib/holidays).
export const TERRITORIES = [
  "metropole",
  "alsace-moselle",
  "guadeloupe",
  "guyane",
  "martinique",
  "la-reunion",
  "mayotte",
  "saint-barthelemy",
  "saint-martin",
  "saint-pierre-et-miquelon",
  "wallis-et-futuna",
  "polynesie-francaise",
  "nouvelle-caledonie",
] as const;

export type Territory = (typeof TERRITORIES)[number];

export const TERRITORY_LABELS: Record<Territory, string> = {
  metropole: "Métropole",
  "alsace-moselle": "Alsace-Moselle",
  guadeloupe: "Guadeloupe",
  guyane: "Guyane",
  martinique: "Martinique",
  "la-reunion": "La Réunion",
  mayotte: "Mayotte",
  "saint-barthelemy": "Saint-Barthélemy",
  "saint-martin": "Saint-Martin",
  "saint-pierre-et-miquelon": "Saint-Pierre-et-Miquelon",
  "wallis-et-futuna": "Wallis-et-Futuna",
  "polynesie-francaise": "Polynésie française",
  "nouvelle-caledonie": "Nouvelle-Calédonie",
};
