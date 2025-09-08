
/**
 * Extrait les traits entre "VI. Traits" et "VII. Capacités" et renvoie un tableau d'objets.
 * - name: première ligne du bloc (titre du trait)
 * - system.description: HTML avec <section><p>…</p></section>, incluant Coût et Effet si présents
 * - system.effects: laissé vide par défaut (à adapter si vous avez une règle d’extraction)
 */
function parseTraitsFromText(texteComplet) {

  const input = extractSection(texteComplet, /VI\.\s*Traits\n/i, /VII\.\s*Capacit[ée]s\n/i);
  if (!input) return ["empty"];

  const lines = input
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(line => !/^\d+$/.test(line)); // Supprime les lignes contenant uniquement un nombre

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
    return formatTrait(trait)
  });
}

function formatItem(item)
{
  const { beforeMatRec, matRec } = splitMatRec(item.body);
  const { beforeEx, exemple } = splitExemple(beforeMatRec);
  const { beforeEffet, effet } = splitEffet(beforeEx);
  const { beforeDd, dd } = splitDd(beforeEffet);
  item.effetText = normalizeParagraph(effet);
  item.descText = normalizeParagraph(beforeDd);
  item.exText = normalizeParagraph(exemple);
  item.dd = normalizeParagraph(dd);
  item.matRec = normalizeParagraph(matRec);
  if(item.active) item.type = "Active"
  else item.type = "Passive"

  return {
    name: item.name,
    system: {
      description: buildHtmlDescription(item),
    },
    folder: null,
    flags: {},
    permission: { default: 2 }
  };
}

function setTriangle(item)
{
  item.system.bfortune = false;
  item.system.nfortune = 0;
  item.system.cfortune = "unchecked";
  item.system.badversite = false;
  item.system.nadversite = 0;
  item.system.cadversite = "unchecked"
}

function formatCapacite(capacite)
{
  var res = formatItem(capacite);
  res.type = 'skill';
  res.img = "systems/fvtt-lore-legacy/assets/skills.png";
  setTriangle(res);
  res.skillLevel = 1;
  res.formula = "@skillLevel";
  return res;
}

function formatSort(sort)
{
  var res = formatItem(sort);
  res.type = 'spell';
  res.img = "systems/fvtt-lore-legacy/assets/open-book.png";
  setTriangle(res);
  res.spellLevel = 1;
  res.formula = "@spellLevel";
  return res;
}

function formatTrait(trait)
{
  var res = formatItem(trait);
  res.type = 'trait';
  res.img = "icons/svg/aura.svg";

  return res;
}
/**
 * Extrait les capacites entre "VII. Capacités" et "VII. Capacités" et renvoie un tableau d'objets.
 * - name: première ligne du bloc (titre du capacite)
 * - system.description: HTML avec <section><p>…</p></section>, incluant Coût et Effet si présents
 * - system.effects: laissé vide par défaut (à adapter si vous avez une règle d’extraction)
 */
async function parseCapaciteFromText(texteComplet) {

  const input = extractSection(texteComplet, /VII\.\s*Capacit[ée]s\n/i, /VIII\.\s*Magie\n/i);
  if (!input) return ["empty"];

  const lines = input
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(line => !/^\d+$/.test(line)); // Supprime les lignes contenant uniquement un nombre
  let capacites = [];
  let current = null;
  let currentCategorie = '';
  let cat = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Détection de catégorie
    const catMatch = line.match(/^Capacités liées (?:au|à la)\s+(.+)$/i);
    if (catMatch) {
      if (capacites.length != 0)
      {
        let pack = await prepareCompendium("capacites"+cat, "Capacités-" + cat, "L&L - Capacités");
        capacites.forEach(skill => fillCompendium(pack, formatCapacite(skill)));
        capacites = [];
      }
      cat = catMatch[1].trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      currentCategorie = line;
      continue;
    }

    // Détection d’une nouvelle capacité avec (P) ou (A) sur la même ligne
    const match = line.match(/^(.+?)\s+\((A|P)\)$/i);
    if (match) {
      if (current) capacites.push(current);
      current = {
        name: match[1].trim(),
        active: match[2].toUpperCase() === 'A',
        body: '',
        categorie: currentCategorie
      };
    } else if (current) {
      current.body += line + '\n';
    }
  }

  if (current) capacites.push(current);
  if (capacites.length != 0)
  {
    let pack = await prepareCompendium("capacites"+cat, "Capacités-" + cat, "L&L - Capacités");
    capacites.forEach(skill => fillCompendium(pack, formatCapacite(skill)));
  }  
}

/**
 * Extrait les capacites entre "VIII. Magie" et "IX. Combat" et renvoie un tableau d'objets.
 * - name: première ligne du bloc (titre du capacite)
 * - system.description: HTML avec <section><p>…</p></section>, incluant Coût et Effet si présents
 * - system.effects: laissé vide par défaut (à adapter si vous avez une règle d’extraction)
 */
async function parseSortsFromText(texteComplet) {

  const input = extractSection(texteComplet, /VIII\.\s*Magie\n/, /IX\.\s*Combat\n/i);
  if (!input) return ["empty"];

  const lines = input
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(line => !/^\d+$/.test(line)); // Supprime les lignes contenant uniquement un nombre
  const sorts = [];
  let current = null;
  let currentCategorie = '';
  let cat = "";


  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Détection de catégorie  // Sortilèges de Magie Rituelle // Sortilèges de Magie Matérielle // Sortilèges de Magie Illusoire

    const catMatch = line.match(/^Sortilèges de Magie \s+(.+)$/i);
    if (catMatch) {
      currentCategorie = line;
      if (sorts.length != 0)
        {
          let pack = await prepareCompendium("sorts"+cat, "Sortilèges-" + cat, "L&L - Sortilèges");
          sorts.forEach(sort => fillCompendium(pack, formatSort(sort)));
          sorts = [];
        }
        cat = catMatch[1].trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        currentCategorie = line;
        continue;
      continue;
    }

    // Détection d’un nouveau sort // Nombre recommandé de participants
    if (/^[A-ZÀ-ÖØ-öø-ÿ][^\n]*$/.test(line) && (lines[i + 1]?.includes("Coût en PM : ") || lines[i + 1]?.includes("Nombre recommandé de participants : "))) {
      if (current) sorts.push(current);
      current = {
        name: line,
        cost: '',
        body: '',
        categorie: currentCategorie
      };
    } else if (current) {
      // Capture du coût
      const costTotalMatch = line.match(/Coût en PM total :\s*(\d+)/i);
      const costMatch = line.match(/Coût en PM :\s*(\d+)/i);
      const costMultiMatch = line.match(/Coût en PM par participant :\s*(\d+)/i);
      const participantsMatch = line.match(/Nombre recommandé de participants :\s*(\d+)/i);

      if (costMatch) {
        current.cost = costMatch[1];
      } else if (costTotalMatch) {
        current.costTotal = costTotalMatch[1];
      } else if (costMultiMatch) {
        current.costMulti = costMultiMatch[1];
      } else if (participantsMatch) {
        current.paticipants = participantsMatch[1];
      } else {
        current.body += line + '\n';
      }
    }

  }

  if (current) sorts.push(current);

  if (capacites.length != 0)
  {
    let pack = await prepareCompendium("sorts"+cat, "Sortilèges-" + cat, "L&L - Sortilèges");
    sorts.forEach(sort => fillCompendium(pack, formatSort(sort)));
  }  
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

/** Sépare le corps en deux: avant "Matériel recommandé : :" et contenu d'Matériel recommandé : :” (si présent). */
function splitMatRec(body) {
  // On capte la première occurrence d’"Effet :" (variantes d'espace/accents)
  const effetRe = /(^|\s)Matériel recommandé\s*:\s*/i;
  const idx = body.search(effetRe);

  if (idx === -1) {
    return { beforeMatRec: body, matRec: '' };
  }

  // Découpage en gardant ce qui suit l’étiquette "Effet :"
  const before = body.slice(0, idx);
  const after = body.slice(idx).replace(effetRe, '');

  return { beforeMatRec: before, matRec: after };
}



/** Construit le HTML final attendu. */
function buildHtmlDescription(element) {
  const parts = [];

  if (element.categorie) {
    parts.push(`<p><strong>${escapeHtml(element.categorie)}</strong></p>`);
  }

  if (element.type) {
    parts.push(`<p><strong>${escapeHtml(element.type)}</strong></p>`);
  }

  if(element.cost)
    parts.push(`<p><strong>Coût :</strong> ${escapeHtml(element.cost)}</p>`);

  if (element.costTotal) {
    parts.push(`<p><strong>Coût total en PM :</strong> ${escapeHtml(element.costTotal)}</p>`);
  }

  if (element.costTotal) {
    parts.push(`<p><strong>Coût pour chaque participants en PM :</strong> ${escapeHtml(element.costMulti)}</p>`);
  }

  if (element.costTotal) {
    parts.push(`<p><strong>Nombre recommandé de participants :</strong> ${escapeHtml(element.paticipants)}</p>`);
  }

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

async function prepareCompendium(packName, label, folderName = "L&L - Divers") {
  // Vérifie si le dossier existe déjà
  console.log("CREATION DE COMPENDIUM : " + packName +" label : " + label + " folderName : " + folderName)
  let folder = game.folders.find(f => f.name === folderName && f.type === "Compendium");
  if (!folder) {
    folder = await Folder.create({
      name: folderName,
      type: "Compendium",
      parent: null
    });
  }

  // Vérifie si le compendium existe déjà
  let pack = game.packs.get(`world.${packName}`);

  if (!pack) {
    // Crée le compendium
    await CompendiumCollection.createCompendium({
      label: label,
      name: packName,
      package: "world", // ou "lorelegacy"
      type: "Item"
    });

    // Récupère le compendium fraîchement créé
    pack = game.packs.get(`world.${packName}`);

    // Déplace le compendium dans le dossier
    await pack.configure({ folder: folder.id });
  }
  console.log(JSON.stringify(pack))
  return pack;
}

async function fillCompendium(pack, item) {
  // Vérifie si un document avec le même nom existe déjà
  const existing = pack.index.find(e => e.name === item.name);
  if (existing) {
    console.log(`Document "${item.name}" déjà présent dans le compendium. Suppression...`);
    const existingDoc = await pack.getDocument(existing._id);
    await existingDoc.delete();
  }

  // Crée et importe le nouveau document
  const doc = await pack.createDocument(item);
  await pack.importDocument(doc);
}

async function createCompendiumTraits(text)
{
    var pack = await prepareCompendium("traits", "Traits");
    const traits = parseTraitsFromText(text);
    traits.forEach(trait => fillCompendium(pack, trait));
}

async function createCompendiumSkills(text)
{
    await parseCapaciteFromText(text);
}

async function createCompendiumSpells(text)
{
    await parseSortsFromText(text);
}

export async function prepareCompendiumWithPDF(text) {
    await createCompendiumTraits(text);
    await createCompendiumSkills(text);
    await createCompendiumSpells(text);
}
