import fs from 'fs';
import pdfjsLib from 'pdfjs-dist';

export async function prepareCompendiumWithPDF(pdfPath) {
    const label = `[PDF] new`;

    const content = JSON.stringify(pdfPath); // JSON.stringify(item);

    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const pdf = await pdfjsLib.getDocument({ data }).promise;
  
    let fullText = '';
    for (let i = 61; i <= 62 /*pdf.numPages*/; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map(item => item.str);
      fullText += strings.join(' ') + '\n';
    }
  
    const proceed = await foundry.applications.api.DialogV2.prompt({
        window: { title: "Proceed" },
        content: "<p>appliquer le PDF : " + content + " content : " +  fullText + "  ?</p>"
        })
    return fullText;

}
