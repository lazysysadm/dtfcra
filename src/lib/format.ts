// Formatage monétaire — module neutre (utilisable côté serveur et client).
export const euroFormat = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
