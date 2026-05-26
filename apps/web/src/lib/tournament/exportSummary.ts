import { toPng } from "html-to-image";
import jsPDF from "jspdf";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

// Slugify Vietnamese tournament name for filenames.
function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 60);
}

export async function exportSummaryAsPDF(node: HTMLElement, tournamentName: string, eventDateIso?: string) {
  // Wait for any pending image loads (e.g. logo from Supabase) so they're
  // included in the rasterized snapshot.
  await Promise.all(
    Array.from(node.querySelectorAll("img")).map(
      (img) => (img as HTMLImageElement).complete
        ? Promise.resolve()
        : new Promise<void>((res) => { img.addEventListener("load", () => res(), { once: true }); img.addEventListener("error", () => res(), { once: true }); }),
    ),
  );

  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    cacheBust: true,
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Fit width to A4, preserve aspect. If total height exceeds 1 page, split.
  const img = new Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = (e) => rej(e);
    img.src = dataUrl;
  });
  const imgAspect = img.width / img.height;
  const targetWidthMm = A4_WIDTH_MM;
  const totalHeightMm = targetWidthMm / imgAspect;

  if (totalHeightMm <= A4_HEIGHT_MM) {
    pdf.addImage(dataUrl, "PNG", 0, 0, targetWidthMm, totalHeightMm);
  } else {
    // Multi-page: paint the image multiple times, each shifted up by one A4 height.
    let remaining = totalHeightMm;
    let yOffset = 0;
    while (remaining > 0) {
      pdf.addImage(dataUrl, "PNG", 0, -yOffset, targetWidthMm, totalHeightMm);
      remaining -= A4_HEIGHT_MM;
      yOffset += A4_HEIGHT_MM;
      if (remaining > 0) pdf.addPage();
    }
  }

  const dateTag = eventDateIso ? eventDateIso.slice(0, 10) : new Date().toISOString().slice(0, 10);
  pdf.save(`${slugify(tournamentName) || "tournament"}-the-le-${dateTag}.pdf`);
}
