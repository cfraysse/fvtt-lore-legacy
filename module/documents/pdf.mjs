import pdfjsLib from 'pdfjs-dist';


export async function prepareCompendiumWithPDF(pdfPath) {
    const label = `[PDF] new`;

    const content = JSON.stringify(pdfPath); // JSON.stringify(item);
  
    const proceed = await foundry.applications.api.DialogV2.prompt({
        window: { title: "Proceed" },
        content: "<p>appliquer le PDF : " + content + " content : " +  "fullText" + "  ?</p>"
        })
}
