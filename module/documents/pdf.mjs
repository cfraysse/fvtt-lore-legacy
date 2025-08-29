
/**
 */

function getFifthLine(text) {
    const lines = text.split(/\r?\n/); // Gère les retours à la ligne Windows et Unix
    return lines.length >= 5 ? lines[4] : null;
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
