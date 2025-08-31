
/**
 */
import fs from "fs";
import { readdir, readFile, writeFile } from "node:fs/promises";

function getFifthLine(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.split(/\r?\n/); // gère les fins de ligne Windows et Unix
    if (lines.length >= 5) {
      return lines[4]; // index 4 = 5ᵉ ligne
    } else {
      return 'Le fichier contient moins de 5 lignes.';
    }
  } catch (err) {
    return `Erreur lors de la lecture du fichier : ${err.message}`;
  }

}

export async function prepareCompendiumWithPDF(pdfPath) {
    
    // Initialize chat data.
    const label = `[PDF] new`;

    const content = getFifthLine(pdfPath); // JSON.stringify(item);

    const proceed = await foundry.applications.api.DialogV2.prompt({
    window: { title: "Proceed" },
    content: "<p>appliquer le PDF " + content + "  ?</p>"
    })
}
