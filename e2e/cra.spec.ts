import { expect, test } from "@playwright/test";

// Parcours complet : inscription → client → mission → saisie CRA → export PDF
// → archive → suppression du compte (RGPD, nettoie les données de test).
test("saisie → enregistrement → export → suppression de compte", async ({ page }) => {
  const suffix = Date.now();
  const email = `e2e-${suffix}@test.local`;
  const password = "E2e-Test-Phrase-2026!";

  await page.goto("/register");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Nom", { exact: true }).fill("E2E Test");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Créer le compte" }).click();
  await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible({
    timeout: 20000,
  });

  await page.goto("/clients");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Raison sociale *").fill("Client E2E");
  await page.getByRole("button", { name: "Créer le client" }).click();
  await expect(page.getByRole("link", { name: "Client E2E" })).toBeVisible({ timeout: 15000 });

  await page.goto("/missions");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Intitulé *").fill("Mission E2E");
  await page.getByLabel("TJM (€ HT) *").fill("500");
  await page.getByLabel("Date de début *").fill("2026-11-01");
  await page.getByRole("button", { name: "Créer la mission" }).click();
  await expect(page.getByRole("link", { name: "Mission E2E" })).toBeVisible({ timeout: 15000 });

  await page.getByRole("link", { name: "Mission E2E" }).click();
  await page.getByRole("link", { name: "Saisir le CRA →" }).click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "CRA", exact: true })).toBeVisible();
  // GET pages never create a CRA: explicit creation first.
  await page.getByRole("button", { name: "Créer le CRA du mois" }).click();
  await page.getByRole("button", { name: "Remplir les jours ouvrés" }).click();
  await expect(page.getByRole("gridcell", { name: /, 1 Travaillé/ }).first()).toBeVisible({
    timeout: 20000,
  });

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "PDF", exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  const path = await download.path();
  expect(path).toBeTruthy();

  await page.goto("/archive");
  await expect(page.getByText("Mission E2E")).toBeVisible();

  await page.goto("/settings/data");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Confirmez avec votre mot de passe").fill(password);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Supprimer mon compte" }).click();
  await expect(page.getByText("Créer un compte", { exact: true })).toBeVisible({
    timeout: 20000,
  });
});
