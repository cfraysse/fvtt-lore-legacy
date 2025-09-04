
/**
 * Extrait les traits entre "VI. Traits" et "VII. Capacités" et renvoie un tableau d'objets.
 * - name: première ligne du bloc (titre du trait)
 * - system.description: HTML avec <section><p>…</p></section>, incluant Coût et Effet si présents
 * - system.effects: laissé vide par défaut (à adapter si vous avez une règle d’extraction)
 */
function parseTraitsFromText(texteComplet) {

  const input = extractSection(texteComplet, /VI\.\s*Traits\n/i, /VII\.\s*Capacit[ée]s\n/i);
  if (!input) return ["empty"];

  const lines = input.split(/\r?\n/);
  const traits = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Détection d’un nouveau trait
    if (/^[A-ZÀ-ÖØ-öø-ÿ][^\n]*$/.test(line) && lines[i + 1]?.includes("Coût")) {
      if (current) traits.push(current);
      current = {
        name: line,
        cost: '',
        body: ''
      };
    } else if (current) {
      // Capture du coût
      const costMatch = line.match(/Co[uû]t\s*:\s*(\d+)/i);
      if (costMatch) {
        current.cost = costMatch[1];
      } else {
        current.body += line + '\n';
      }
    }
  }

  if (current) traits.push(current);

  // Traitement final
  return traits.map(trait => {
    const { beforeEffet, effet } = splitEffet(trait.body);
    trait.descText = normalizeParagraph(beforeEffet);
    trait.effetText = normalizeParagraph(effet);

    return {
      name: trait.name,
      type: 'trait',
      img: "icons/svg/aura.svg",
      system: {
        description: buildHtmlDescription(trait),
        effects: ''
      },
      folder: null,
      flags: {},
      permission: { default: 2 }
    };
  });
}


/**
 * Extrait les capacites entre "VII. Capacités" et "VII. Capacités" et renvoie un tableau d'objets.
 * - name: première ligne du bloc (titre du capacite)
 * - system.description: HTML avec <section><p>…</p></section>, incluant Coût et Effet si présents
 * - system.effects: laissé vide par défaut (à adapter si vous avez une règle d’extraction)
 */
function parseCapaciteFromText(texteComplet) {

  const input = extractSection(texteComplet, /VII\.\s*Capacit[ée]s\n/i, /VIII\.\s*Magie\n/i);
  if (!input) return ["empty"];

  const lines = input.split(/\r?\n/);
  const capacites = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Détection d’une nouvelle capacité avec (P) ou (A) sur la même ligne
    const match = line.match(/^(.+?)\s+\((A|P)\)$/i);
    if (match) {
      if (current) capacites.push(current);
      current = {
        name: match[1].trim(),
        active: match[2].toUpperCase() === 'A',
        body: ''
      };
    } else if (current) {
      current.body += line + '\n';
    }

  }

  if (current) capacites.push(current);

  // capaciteement final
  return capacites.map(capacite => {
    const { beforeEx, ex } = splitExemple(capacite.body);
    const { beforeDd, dd } = splitDd(beforeEx);
    capacite.descText = normalizeParagraph(beforeDd);
    capacite.exText = normalizeParagraph(ex);
    capacite.dd = normalizeParagraph(dd);

    return {
      name: capacite.name,
      type: 'skill',
      img: "icons/svg/aura.svg",
      system: {
        description: buildHtmlDescription(capacite),
        "skillLevel": 1,
        "formula": "@skillLevel",
        "bfortune": true,
        "nfortune": 0,
        "cfortune": "unchecked",
        "badversite": false,
        "nadversite": 0,
        "cadversite": "unchecked"      
      },
      folder: null,
      flags: {},
      permission: { default: 2 }
    };
  });
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
/** Sépare le corps en deux: avant "Exemple :" et contenu Exemple :” (si présent). */
function splitExemple(body) {
  // On capte la première occurrence (variantes d'espace/accents)
  const effetRe = /(^|\s)Exemple\s*:\s*/i;
  const idx = body.search(effetRe);

  if (idx === -1) {
    return { beforeEx: body, exemple: '' };
  }

  // Découpage en gardant ce qui suit l’étiquette 
  const before = body.slice(0, idx);
  const after = body.slice(idx).replace(effetRe, '');

  return { beforeEx: before, exemple: after };
}

/** Sépare le corps en deux: avant "Degré de Difficulté :" et contenu Degré de Difficulté :” (si présent). */
function splitDd(body) {
  // On capte la première occurrence (variantes d'espace/accents)
  const effetRe = /(^|\s)Degré\s*de\s*Difficult[ée]\s*:\s*/i;
  const idx = body.search(effetRe);

  if (idx === -1) {
    return { beforeDd: body, dd: '' };
  }

  // Découpage en gardant ce qui suit l’étiquette 
  const before = body.slice(0, idx);
  const after = body.slice(idx).replace(effetRe, '');

  return { beforeDd: before, dd: after };
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
function buildHtmlDescription(element) {
  const parts = [];

  if(element.cost)
    parts.push(`<p><strong>Coût :</strong> ${escapeHtml(element.cost)}</p>`);

  if (element.descText) {
    parts.push(`<p>${escapeHtml(element.descText)}</p>`);
  }

  if (element.effetText) {
    parts.push(`<p><strong>Effet :</strong> ${escapeHtml(element.effetText)}</p>`);
  }
  
  if (element.dd) {
    parts.push(`<p><strong>Degré de difficulté :</strong> ${escapeHtml(element.dd)}</p>`);
  }

  if (element.exText) {
    parts.push(`<p><strong>Exemple :</strong> ${escapeHtml(element.exText)}</p>`);
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
  let pack = game.packs.get(`world.${packName}`);

  if (!pack) {
    // Crée le compendium s'il n'existe pas
    const createdPack = await CompendiumCollection.createCompendium({
      label: "Traits",
      name: packName,
      package: packageName,
      type: "Item"
    });

    pack = game.packs.get(`world.${packName}`);
  }

  return pack;
}

async function prepareCompendiumSkills() {
  const packName = "capacites";
  const packageName = "lorelegacy";
  // Vérifie si le compendium existe déjà
  let pack = game.packs.get(`world.${packName}`);

  if (!pack) {
    // Crée le compendium s'il n'existe pas
    const createdPack = await CompendiumCollection.createCompendium({
      label: "Capacités",
      name: packName,
      package: packageName,
      type: "Item"
    });

    pack = game.packs.get(`world.${packName}`);
  }

  return pack;
}

async function fillCompendium(pack, item) {
  const doc = await pack.createDocument(item);
  await pack.importDocument(doc);
}

export async function prepareCompendiumWithPDF(text) {
    
    // Initialize chat data.
    var packTraits = await prepareCompendiumTraits();
    var packskills = await prepareCompendiumSkills();
    const traits = parseTraitsFromText(text);
    traits.forEach(trait => fillCompendium(packTraits, trait));
    const skills = parseCapaciteFromText(text);
    skills.forEach(skill => fillCompendium(packskills, skill));
}
