
/**
 */
export function prepareCompendiumWithPDF(pdfPath) {
    
    // Initialize chat data.
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const label = `[PDF] new`;

    const content = pdfPath; // JSON.stringify(item);

    if (!this.system.formula) {
      ChatMessage.create({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
        content: content,
      });
    }
}
