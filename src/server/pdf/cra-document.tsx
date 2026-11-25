import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { ENTRY_TYPE_LABELS } from "@/lib/timesheet";
import type { ExportData } from "@/server/services/exports";

export function CraDocument({ data, logoUri }: { data: ExportData; logoUri: string | null }) {
  const brand = data.profile?.brandColor ?? "#0f172a";
  const styles = StyleSheet.create({
    page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#111111" },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 2,
      borderBottomColor: brand,
      paddingBottom: 8,
      marginBottom: 12,
    },
    brand: { fontSize: 16, fontFamily: "Helvetica-Bold", color: brand },
    logo: { width: 60, height: 60, objectFit: "contain" },
    h2: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 4 },
    meta: { marginBottom: 2 },
    table: { marginTop: 12 },
    head: { flexDirection: "row", backgroundColor: brand, color: "#ffffff", paddingVertical: 4 },
    row: {
      flexDirection: "row",
      borderBottomWidth: 0.5,
      borderBottomColor: "#cccccc",
      paddingVertical: 3,
    },
    cDate: { width: "18%" },
    cType: { width: "22%" },
    cQty: { width: "12%", textAlign: "right" },
    cComment: { width: "48%" },
    totals: { marginTop: 12, alignItems: "flex-end" },
    totalLine: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 2 },
    totalLabel: { width: 170, textAlign: "right", marginRight: 8 },
    totalValue: { width: 80, textAlign: "right", fontFamily: "Helvetica-Bold" },
    signatures: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 28,
    },
    signatureBox: { width: "48%" },
    signatureTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 4 },
    signatureHint: { fontSize: 8, color: "#666666", marginTop: 6, marginBottom: 4 },
    signatureSpace: {
      height: 70,
      borderWidth: 0.5,
      borderColor: "#999999",
      borderRadius: 2,
    },
  });
  const num = (value: number) => String(value).replace(".", ",");

  return (
    <Document
      title={`CRA ${data.mission.title} — ${data.periodLabel}`}
      author={data.profile?.legalName ?? "dtfcra"}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>{data.profile?.legalName ?? "dtfcra"}</Text>
            {data.profile?.siret ? (
              <Text style={styles.meta}>SIRET {data.profile.siret}</Text>
            ) : null}
            {data.profile?.vatNumber ? (
              <Text style={styles.meta}>TVA {data.profile.vatNumber}</Text>
            ) : null}
            {data.profile?.address ? <Text style={styles.meta}>{data.profile.address}</Text> : null}
          </View>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- PDF image, not a DOM element */}
          {logoUri ? <Image src={logoUri} style={styles.logo} /> : null}
        </View>
        <Text style={styles.h2}>Compte rendu d&apos;activité — {data.periodLabel}</Text>
        <Text style={styles.meta}>Consultant : {data.consultant}</Text>
        <Text style={styles.meta}>Client : {data.client.legalName}</Text>
        <Text style={styles.meta}>Mission : {data.mission.title}</Text>
        <View style={styles.table}>
          <View style={styles.head}>
            <Text style={styles.cDate}>Date</Text>
            <Text style={styles.cType}>Type</Text>
            <Text style={styles.cQty}>Quantité</Text>
            <Text style={styles.cComment}>Commentaire</Text>
          </View>
          {data.entries.map((entry) => (
            <View key={entry.date} style={styles.row}>
              <Text style={styles.cDate}>{entry.date}</Text>
              <Text style={styles.cType}>{ENTRY_TYPE_LABELS[entry.type]}</Text>
              <Text style={styles.cQty}>{num(entry.quantity)}</Text>
              <Text style={styles.cComment}>{entry.comment ?? ""}</Text>
            </View>
          ))}
        </View>
        <View style={styles.totals}>
          <View style={styles.totalLine}>
            <Text style={styles.totalLabel}>Jours facturables</Text>
            <Text style={styles.totalValue}>{num(data.totals.billableDays)}</Text>
          </View>
          <View style={styles.totalLine}>
            <Text style={styles.totalLabel}>Demi-journées</Text>
            <Text style={styles.totalValue}>{data.totals.halfDays}</Text>
          </View>
          <View style={styles.totalLine}>
            <Text style={styles.totalLabel}>Astreintes</Text>
            <Text style={styles.totalValue}>{num(data.totals.onCallDays)}</Text>
          </View>
          <View style={styles.totalLine}>
            <Text style={styles.totalLabel}>Congés / absences</Text>
            <Text style={styles.totalValue}>
              {num(data.totals.leaveDays + data.totals.unavailableDays)}
            </Text>
          </View>
        </View>
        <View style={styles.signatures}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>Signature du consultant</Text>
            <Text>{data.consultant}</Text>
            <Text style={styles.signatureHint}>Date et signature :</Text>
            <View style={styles.signatureSpace} />
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>Signature du client</Text>
            <Text>{data.client.legalName}</Text>
            <Text style={styles.signatureHint}>Date et signature :</Text>
            <View style={styles.signatureSpace} />
          </View>
        </View>
      </Page>
    </Document>
  );
}
