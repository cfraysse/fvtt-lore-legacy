
/**
 */
/**
 * Extrait les traits entre "VI. Traits" et "VII. Capacités" et renvoie un tableau d'objets.
 * - name: première ligne du bloc (titre du trait)
 * - system.description: HTML avec <section><p>…</p></section>, incluant Coût et Effet si présents
 * - system.effects: laissé vide par défaut (à adapter si vous avez une règle d’extraction)
 */
function parseTraitsFromText(input) {
  const section = extractSection(input, /VI\.\s*Traits\n/i, /VII\.\s*Capacit[ée]s\n/i);
  if (!section) return ["empty"];

  // Trouve les blocs: "Nom du trait" + ligne "Coût : …" + corps jusqu'au prochain bloc ou fin
  const traitRegex = new RegExp(
    String.raw`(^[^\r\n].+?)\r?\n\s*Co[uû]t\s*:\s*([^\r\n]+)([\s\S]*?)(?=^[^\r\n].+?\r?\n\s*Co[uû]t\s*:|\Z)`,
    'gmi'
  );

  const results = [];
  let match;

  while ((match = traitRegex.exec(section)) !== null) {
    const rawName = cleanInline(match[1]);
    const rawCost = cleanInline(match[2]);
    const rawBody = match[3] || '';

    // Séparer description avant/after "Effet :"
    const { beforeEffet, effet } = splitEffet(rawBody);

    // Normalisations de texte (césures, sauts de ligne, espaces)
    const descText = normalizeParagraph(beforeEffet);
    const effetText = normalizeParagraph(effet);

    const html = buildHtmlDescription(rawCost, descText, effetText);

    results.push({
      name: rawName,
      type: 'trait',
      img: "icons/svg/aura.svg",
      system: {
        description: html,
        effects: ''
      },
      folder: null,
      flags: {},
      permission: { default: 2 } 
    });
  }

  return results;
}

/* ---------- Helpers ---------- */

/** Isole la sous-section entre deux en-têtes (regex), ou null si non trouvée. */
function extractSection(text, startRe, endRe) {
  const startMatch = startRe.exec(text);
  if (!startMatch) return null;
  const startIdx = startMatch.index + startMatch[0].length;

  endRe.lastIndex = 0;
  const endMatch = endRe.exec(text.slice(startIdx));
  const endIdx = endMatch ? startIdx + endMatch.index : text.length;

  return text.slice(startIdx, endIdx);
}

/** Nettoyage léger d’une ligne (trim + collapse espaces). */
function cleanInline(s) {
  return (s || '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Corrige césures, recolle les lignes et nettoie les espaces. */
function normalizeParagraph(s) {
  if (!s) return '';

  let t = s;

  // Supprimer césures en fin de ligne: "adver-\nsité" -> "adversité"
  t = t.replace(/([A-Za-zÀ-ÖØ-öø-ÿ])-\s*[\r\n]+\s*([A-Za-zÀ-ÖØ-öø-ÿ])/g, '$1$2');

  // Remplacer retours à la ligne internes par espaces (on reconstituera des <p> logiques ailleurs)
  t = t.replace(/[\r\n]+/g, ' ');

  // Espaces autour de ponctuation française
  t = t
    .replace(/\s*([;,.:!?])\s*/g, ' $1 ')
    .replace(/\s+/g, ' ')
    .trim();

  return t;
}

/** Sépare le corps en deux: avant "Effet :" et contenu d'“Effet :” (si présent). */
function splitEffet(body) {
  // On capte la première occurrence d’"Effet :" (variantes d'espace/accents)
  const effetRe = /(^|\s)Effet\s*:\s*/i;
  const idx = body.search(effetRe);

  if (idx === -1) {
    return { beforeEffet: body, effet: '' };
  }

  // Découpage en gardant ce qui suit l’étiquette "Effet :"
  const before = body.slice(0, idx);
  const after = body.slice(idx).replace(effetRe, '');

  return { beforeEffet: before, effet: after };
}

/** Construit le HTML final attendu. */
function buildHtmlDescription(cost, descText, effetText) {
  const parts = [];
  parts.push(`<p><strong>Coût :</strong> ${escapeHtml(cost)}</p>`);

  if (descText) {
    parts.push(`<p>${escapeHtml(descText)}</p>`);
  }

  if (effetText) {
    parts.push(`<p><strong>Effet :</strong> ${escapeHtml(effetText)}</p>`);
  }

  return `<section>${parts.join('')}</section>`;
}

/** Échappe les caractères HTML spéciaux. */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getFifthLine(text) {
    const lines = text.split(/\r?\n/); // Gère les retours à la ligne Windows et Unix
    return lines.length >= 5 ? lines[4] : null;
  }

async function prepareCompendiumTraits() {
  const packName = "traits";
  const packageName = "lorelegacy";
  // Vérifie si le compendium existe déjà
  let pack = game.packs.get(`${packageName}.${packName}`);

  if (!pack) {
    // Crée le compendium s'il n'existe pas
    const createdPack = await CompendiumCollection.createCompendium({
      entity: "Item", // ou "Item", "Actor", selon ton besoin
      label: "Traits",
      name: packName,
      package: packageName,
      type: "Item"
    });

    pack = game.packs.get(`${packageName}.${packName}`);
    await foundry.applications.api.DialogV2.prompt({
      window: { title: "Proceed" },
      content: "<p>createdPack " + JSON.stringify(createdPack) + "  ?</p>"
    })
  }

  await foundry.applications.api.DialogV2.prompt({
    window: { title: "Proceed" },
    content: "<p>pack " + JSON.stringify(pack) + "  ?</p>"
  })

    await foundry.applications.api.DialogV2.prompt({
    window: { title: "Proceed" },
    content: "<p>game.packs " + JSON.stringify(game.packs.toJSON()) + "  ?</p>"
  })
  
  await foundry.applications.api.DialogV2.prompt({
    window: { title: "Proceed" },
    content: "<p>CompendiumPacks.content " + JSON.stringify(game.packs.contents()) + "  ?</p>"
  })
  return pack;
}

async function fillCompendium(pack, item) {

  await pack.createDocument(item);
}

export async function prepareCompendiumWithPDF(pdfPath) {
    
    // Initialize chat data.
    const label = `[PDF] new`;
    var packTraits = await prepareCompendiumTraits();
    const traits = parseTraitsFromText(pdfPath);
    fillCompendium(packTraits, traits[1]);
    const content = JSON.stringify(traits[1]);
    const proceed = await foundry.applications.api.DialogV2.prompt({
    window: { title: "Proceed" },
    content: "<p>appliquer le PDF " + content + "  ?</p>"
    })
}
