import { renderToBuffer } from "@react-pdf/renderer";
import type { ExportData } from "@/server/services/exports";
import { readUpload, sniffImage } from "@/server/services/uploads";
import { CraDocument } from "./cra-document";

export async function buildCraPdf(data: ExportData): Promise<Buffer> {
  let logoUri: string | null = null;
  if (data.profile?.logoPath) {
    try {
      const buffer = await readUpload(data.profile.logoPath);
      const kind = sniffImage(buffer);
      if (kind) {
        logoUri = `data:image/${kind};base64,${buffer.toString("base64")}`;
      }
    } catch {
      // Missing logo file: export without it.
    }
  }
  return renderToBuffer(<CraDocument data={data} logoUri={logoUri} />);
}
