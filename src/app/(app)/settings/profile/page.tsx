import { requireUser } from "@/server/auth/helpers";
import { getProfile } from "@/server/services/profile";
import { ProfileForm } from "@/components/referential/profile-form";
import { LogoUpload } from "@/components/export/logo-upload";

export default async function ProfilePage() {
  const { user } = await requireUser();
  const profile = await getProfile(user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Paramètres</h1>
      <ProfileForm
        initial={
          profile
            ? {
                legalName: profile.legalName,
                consultantName: profile.consultantName,
                legalForm: profile.legalForm,
                siret: profile.siret,
                address: profile.address,
                vatNumber: profile.vatNumber,
                brandColor: profile.brandColor,
                holidayTerritory: profile.holidayTerritory,
              }
            : null
        }
      />
      <LogoUpload hasLogo={Boolean(profile?.logoPath)} />
    </div>
  );
}
