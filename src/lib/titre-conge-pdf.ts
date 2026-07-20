import jsPDF from "jspdf";
import type { CongeWithWorker } from "./supabase-helpers";
import { CONGE_TYPES, congeDuration } from "./supabase-helpers";

const UNITS = ["", "UN", "DEUX", "TROIS", "QUATRE", "CINQ", "SIX", "SEPT", "HUIT", "NEUF", "DIX",
  "ONZE", "DOUZE", "TREIZE", "QUATORZE", "QUINZE", "SEIZE", "DIX-SEPT", "DIX-HUIT", "DIX-NEUF"];
const TENS = ["", "", "VINGT", "TRENTE", "QUARANTE", "CINQUANTE", "SOIXANTE", "SOIXANTE", "QUATRE-VINGT", "QUATRE-VINGT"];

function numToFrench(n: number): string {
  if (n === 0) return "ZERO";
  if (n < 20) return UNITS[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (t === 7 || t === 9) {
      const base = TENS[t];
      const rest = 10 + u;
      return u === 0 ? base + " " + UNITS[10] : base + " " + UNITS[rest];
    }
    if (u === 0) return TENS[t];
    if (u === 1 && t !== 8) return TENS[t] + " ET UN";
    return TENS[t] + " " + UNITS[u];
  }
  if (n < 1000) {
    const c = Math.floor(n / 100);
    const rest = n % 100;
    const prefix = c === 1 ? "CENT" : UNITS[c] + " CENT" + (rest === 0 ? "S" : "");
    return rest === 0 ? prefix : prefix + " " + numToFrench(rest);
  }
  return String(n);
}

function fmtDateFR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function generateTitreCongePdf(conge: CongeWithWorker, refNumber?: number) {
  const worker = conge.workers;
  const fullName = (worker?.full_name || "").trim();
  const parts = fullName.split(/\s+/);
  const nom = parts[0] || "";
  const prenom = parts.slice(1).join(" ") || "";
  const fonction = (worker as any)?.position || (worker as any)?.department || "";
  const days = congeDuration(conge.start_date, conge.end_date);
  const daysWords = numToFrench(days);
  const nature = CONGE_TYPES[conge.conge_type].toUpperCase();
  const year = new Date(conge.start_date).getFullYear();
  const ref = `${String(refNumber ?? 1).padStart(2, "0")}./ ${year}`;
  const today = new Date();
  const todayStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

  const pdf = new jsPDF("p", "mm", "a4");
  const pageW = pdf.internal.pageSize.getWidth();
  let y = 30;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.text("TITRE DE CONGE", pageW / 2, y, { align: "center" });
  y += 15;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(12);
  pdf.text(`Réf n° : ${ref}`, 20, y);
  y += 15;

  pdf.text("MR,", 20, y);
  y += 15;

  const line = (label: string, value: string) => {
    pdf.setFont("helvetica", "bold");
    pdf.text(`${label} :`, 20, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(value, 70, y);
    y += 10;
  };

  line("Nom", nom);
  line("Prénom", prenom);
  line("Fonction", fonction);
  y += 5;

  pdf.setFont("helvetica", "bold");
  pdf.text("Est autorisé à prendre un congé :", 20, y);
  pdf.setFont("helvetica", "normal");
  const daysText = `${daysWords} JOURS ( ${days} JOURS )`;
  pdf.text(daysText, 20, y + 8);
  y += 20;

  line("Nature", nature);
  line("Période du", `${fmtDateFR(conge.start_date)} jusqu'au ${fmtDateFR(conge.end_date)}`);

  y += 10;
  pdf.setFont("helvetica", "bold");
  pdf.text(`FAIT A OULED MOUSSA, LE ${todayStr}`, 20, y);
  y += 20;

  pdf.setFont("helvetica", "italic");
  pdf.text("L'intéressé", 30, y);
  pdf.text("SERVICE PERSONNELES", pageW - 70, y);
  y += 25;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("Copies à :", 20, y);
  y += 8;
  pdf.setFont("helvetica", "normal");
  pdf.text("- Intéressé(e). GERANT DE L'ENTEPRISE", 25, y);
  y += 7;
  pdf.text("- Dossier Personnel.", 25, y);

  const safeName = fullName.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_") || "conge";
  pdf.save(`TITRE_DE_CONGE_${safeName}.pdf`);
}
