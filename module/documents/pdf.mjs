
/**
 */
export async function prepareCompendiumWithPDF(pdfPath) {
    
    // Initialize chat data.
    const label = `[PDF] new`;

    const content = JSON.stringify(pdfPath); // JSON.stringify(item);

    const proceed = await foundry.applications.api.DialogV2.prompt({
    window: { title: "Proceed" },
    content: "<p>appliquer le PDF : " + content + "  ?</p>"
    })
}
