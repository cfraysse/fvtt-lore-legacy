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
      extractSpecs(line, current);
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
  item.effetText = normalizeParagraph(effet);
  item.descText = normalizeParagraph(beforeEffet);
  item.exText = normalizeParagraph(exemple);
  item.matRec = normalizeParagraph(matRec);

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

function formatArme(arme)
{
  var res = formatItem(arme);
  res.type = 'spell';
  res.img = "systems/fvtt-lore-legacy/assets/sword-brandish.png";
  setTriangle(res);
  let catMatch;

  if (arme.cd)
    catMatch = arme.cd.match(/^1d8\s*\+\s*(\d+)$/i);
  else if (arme.degat)
    catMatch = arme.degat.match(/^1d8\s*\+\s*(\d+)$/i);


  if (catMatch) {
    res.system.spellLevel = parseInt(catMatch[1], 10);
  }
  else
  {
    res.system.spellLevel = 0;
  }
  res.system.formula = "@spellLevel";
  res.system.weight = arme.enc ? parseInt(arme.enc, 10) : 0;

  return res;
}

function formatArmure(armure)
{
  armure.cp = armure.cd;
  delete armure.cd;
  var res = formatItem(armure);
  res.type = 'item';
  res.img = "systems/fvtt-lore-legacy/assets/armore-vest.png";

  res.system.effects = armure.cd;
  res.system.weight = armure.enc ? parseInt(armure.enc, 10) : 0;
  res.system.quantity = 1;
  return res;
}

function formatSort(sort)
{
  var res = formatItem(sort);
  res.type = 'spell';
  res.img = "systems/fvtt-lore-legacy/assets/open-book.png";
  setTriangle(res);
  res.spellLevel = 0;
  res.formula = "@spellLevel";
  res.weight = 0;
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
      let active;
      if (match[2].toUpperCase() === 'A')
        active = "Active"
      else
        active = "Passive"
      current = {
        name: match[1].trim(),
        active: active,
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

  const input = extractSection(texteComplet, /VIII\.\s*Magie\n/, /\nSpiritisme\n/i);
  if (!input) console.log("Section sort vide");

  const lines = input
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(line => !/^\d+$/.test(line)); // Supprime les lignes contenant uniquement un nombre
  let sorts = [];
  let current = null;
  let currentCategorie = '';
  let cat = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Détection de catégorie  // Sortilèges de Magie Rituelle // Sortilèges de Magie Matérielle // Sortilèges de Magie Illusoire

    const catMatch = line.match(/^Sortil[èe]ges de Magie\s+(.+)$/i);
    if (catMatch) {
      if (sorts.length != 0)
      {
        let pack = await prepareCompendium("sorts"+cat, "Sortilèges-" + cat, "L&L - Sortilèges");
        sorts.forEach(sort => fillCompendium(pack, formatSort(sort)));
        sorts = [];
      }
      cat = catMatch[1].trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      currentCategorie = line;
    } else if (/^[A-ZÀ-ÖØ-öø-ÿ][^\n]*$/.test(line) && (lines[i + 1]?.includes("Coût en PM : ") || lines[i + 1]?.includes("Nombre recommandé de participants : "))) {
      if (current) sorts.push(current);
      current = {
        name: line,
        cost: '',
        body: '',
        categorie: currentCategorie
      };
    } else if (current) {
      extractSpecs(line, current);
    }
  }

  if (current) sorts.push(current);

  if (sorts.length != 0)
  {
    let pack = await prepareCompendium("sorts"+cat, "Sortilèges-" + cat, "L&L - Sortilèges");
    sorts.forEach(sort => fillCompendium(pack, formatSort(sort)));
  }  
}

/**
 * Extrait les capacites entre "VIII. Magie" et "IX. Combat" et renvoie un tableau d'objets.
 * - name: première ligne du bloc (titre du capacite)
 * - system.description: HTML avec <section><p>…</p></section>, incluant Coût et Effet si présents
 * - system.effects: laissé vide par défaut (à adapter si vous avez une règle d’extraction)
 * 

X. Objets & Équipement
Armes
Armures
XI. Montures & Véhicules

*/
async function parseArmesFromText(texteComplet) {

  const input = extractSection(texteComplet, /\nArmes\n/, /\nArmures\n/i);
  if (!input) console.log("Section arme vide");

  const lines = input
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(line => !/^\d+$/.test(line)); // Supprime les lignes contenant uniquement un nombre
  let armes = [];
  let current = null;
  let currentCategorie = 'Armes divers';
  let cat = "armesdivers";
  let isTableau = false;
  let tableau = [];
  let headers;
  let expectedFields;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (isCategorie(line)) {
      if (armes.length != 0)
      {
        const grouped = groupDataLines(tableau, expectedFields);
        const armesFull = grouped.map(line => parseGroupedLine(line, headers));
        let pack = await prepareCompendium(cat, currentCategorie, "L&L - Armes");
        armes.forEach(arme => { 
          const normName = normalizeName(arme.name);
          const match = armesFull.find(armeFull => normalizeName(armeFull.name) === normName);
          if (match) {
            arme = { ...arme, ...match };
          }
          fillCompendium(pack, formatArme(arme));
        });
        armes = [];
      }
      cat = "armes" + line.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
      currentCategorie = line;
      isTableau = false;
      tableau = [];
    } else if(isTableauHeader(line)){
      isTableau = true;
      headers = buildHeaders(line);
      expectedFields = headers.length;
    } else if(isTableau){
      tableau.push(line);
    } else 
    { 
      if(lines[i]?.includes("• "))
      {
        current = {
          name: '',
          cost: '',
          body: '',
          categorie: currentCategorie
        };
      }

      if (current) {
        extractSpecs(line, current);
      }

      if (current && current.name != '' && (lines[i]?.includes("(2M)") || lines[i]?.includes("(1M)"))) {
        armes.push(current);
        current = null;
      }
    }
  }

  if (current && current.name != '') armes.push(current);

  if (armes.length != 0)
  {
    let pack = await prepareCompendium(cat, currentCategorie, "L&L - Armes");
    const grouped = groupDataLines(tableau, expectedFields);
    const armesFull = grouped.map(line => parseGroupedLine(line, headers));
    armes.forEach(arme => { 
      const normName = normalizeName(arme.name);
      const match = armesFull.find(armeFull => normalizeName(armeFull.name) === normName);
      if (match) {
        arme = { ...arme, ...match };
      }
      fillCompendium(pack, formatArme(arme));
    });
  }
}

/*
*/
async function parseArmuresFromText(texteComplet) {

  const input = extractSection(texteComplet, /\nArmures\n/, /\nArcanotech\n/i);
  if (!input) console.log("Section armure vide");

  const lines = input
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(line => !/^\d+$/.test(line)); // Supprime les lignes contenant uniquement un nombre
  let armures = [];
  let current = null;
  let currentCategorie = 'Armures divers';
  let cat = "armuresdivers";
  let isTableau = false;
  let tableau = [];
  let headers;
  let expectedFields;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (isCategorie(line)) {
      if (armures.length != 0)
      {

        const grouped = groupDataLines(tableau, expectedFields);
        const armuresFull = grouped.map(line => parseGroupedLine(line, headers));
        let pack = await prepareCompendium(cat, currentCategorie, "L&L - Armures");
        armures.forEach(armure => { 
          const normName = normalizeName(armure.name);
          const match = armuresFull.find(armureFull => normalizeName(armureFull.name) === normName);
          if (match) {
            armure = { ...armure, ...match };
          }
          fillCompendium(pack, formatArmure(armure));
        });
        armures = [];
      }
      cat = "armures" + line.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
      currentCategorie = line;
      isTableau = false;
      tableau = [];
    } else if(isTableauStart(line)){
      if (current && current.name != '') {
        armures.push(current);
        current = null;
      }
        
      isTableau = true;
      tableau.push(line);
    }
    else if(isTableauHeader(line)){
      isTableau = true;
      tableau.push(line);
      const header = buildHeaderLine(tableau); //      \s
      headers = buildHeaders(header);
      expectedFields = headers.length;
      tableau = [];

    } else if(isTableau){
      tableau.push(line);
    } else 
    { 
      if(lines[i]?.includes("• "))
      {
        if (current && current.name != '') {
          armures.push(current);
          current = null;
        }

        current = {
          name: '',
          cost: '',
          body: '',
          categorie: currentCategorie
        };
      }

      if (current) {
        extractSpecs(line, current);
      }


    }
  }

  if (current && current.name != '') armures.push(current);

  if (armures.length != 0)
  {
    const grouped = groupDataLines(tableau, expectedFields);
    const armuresFull = grouped.map(line => parseGroupedLine(line, headers));
    let pack = await prepareCompendium(cat, currentCategorie, "L&L - Armures");
    armures.forEach(armure => { 
      const normName = normalizeName(armure.name);
      const match = armuresFull.find(armureFull => normalizeName(armureFull.name) === normName);
      if (match) {
        armure = { ...armure, ...match };
      }
      fillCompendium(pack, formatArmure(armure));
    });
  }
}

/* ---------- TABLEAUX ---------- */

function endsWithCout(str) {
  return str.trim().endsWith('coût');
}

function isTableauHeader(line) {
  return endsWithCout(line);
}

// Utilitaires
const isTableauStart = s => s.includes(" Enc. ");
const isInteger = s => /^\d+$/.test(s);
const isMun = s => /^\d+(?:\(\d+\))?\/\d+$/.test(s);
const normalizeHeader = h => h.toLowerCase().replace(/[^\w]/g, '').replace(/é/g, 'e');

// 1) Trouver l'index de l'entête (ligne contenant "enc")
function findHeaderLineIndex(lines) {
  const idx = lines.findIndex(l => /enc/i.test(l));
  return idx === -1 ? 0 : idx;
}

function buildHeaderLine(tableau) {
  return tableau
    .map(str => str.replace(/[\r\n]/g, '')) // Supprime \r et \n
    .join(' ')                             // Concatène avec un espace
    .trim();   
};

// 2) Construire la liste normalisée des colonnes à partir de l'en-tête
function buildHeaders(headerLine) {
  const headerParts = headerLine.split(/\s+/);
  const encIdx = headerParts.findIndex(p => /enc/i.test(p));
  const rawCols = headerParts.slice(encIdx === -1 ? 0 : encIdx);
  const headers = [];

  for (let i = 0; i < rawCols.length; i++) {
    const h = rawCols[i].toLowerCase();
    if (h === 'p.' && rawCols[i + 1]?.toLowerCase() === 'moy') { headers.push('pmoy'); i++; continue; }
    if (h === 'p.' && rawCols[i + 1]?.toLowerCase().startsWith('max')) { headers.push('pmax'); i++; continue; }
    if (h === 'code' && rawCols[i + 1]?.toLowerCase().startsWith('de') && rawCols[i + 2]?.toLowerCase().startsWith('protection')) { headers.push('cd'); i++; i++; continue; }
    if (h === 'mod.' && rawCols[i + 1]?.toLowerCase().startsWith('rap.')) { headers.push('modrap'); i++; continue; }

    const n = normalizeHeader(h);
    if (n.startsWith('mun')) headers.push('mun');
    else if (n.startsWith('cout')) headers.push('cout');
    else headers.push(n);
  }

  return headers;
}

// 3) Regrouper les lignes de données quand un nom est sur plusieurs lignes
function groupDataLines(dataLines, expectedFields) {
  const grouped = [];
  let buffer = '';

  for (const raw of dataLines) {
    const line = raw.trim().replace(/-$/, "");
    if (!line) continue;

    buffer = buffer ? buffer + ' ' + line : line;

    const parts = buffer.split(/\s+/);
    const firstNumeric = parts.findIndex(p => isInteger(p));
    const values = firstNumeric >= 0 ? parts.slice(firstNumeric) : [];

    // Si on a assez de champs numériques, on considère que la ligne est complète
    if (values.length >= expectedFields) {
      grouped.push(buffer.trim());
      buffer = '';
    }
  }

  if (buffer) grouped.push(buffer.trim());
  return grouped;
}

// 4) Fusionner petits fragments (ex. "V" "ig" => "Vig")
function mergeFragments(tokens) {
  const t = [...tokens];
  let i = 0;
  while (i < t.length - 1) {
    if (t[i].length === 1 && /^[A-Za-z]$/.test(t[i]) &&
        /^[A-Za-z]{1,3}$/.test(t[i+1]) && !/^\d+$/.test(t[i+1])) {
      t[i] = t[i] + t[i+1];
      t.splice(i+1, 1);
      continue;
    }
    if (t[i].length <= 2 && t[i+1].length <= 3 && /^[A-Za-z]+$/.test(t[i]) && /^[A-Za-z]+$/.test(t[i+1])) {
      t[i] = t[i] + t[i+1];
      t.splice(i+1, 1);
      continue;
    }
    i++;
  }
  return t;
}

// 5) Heuristique pour splitter center tokens en pmoy / pmax
function splitPmoyPmax(center, headers) {
  const out = { pmoy: '', pmax: '' };
  if (!headers.includes('pmoy') || !headers.includes('pmax')) {
    if (headers.includes('pmoy')) out.pmoy = center.join(' ');
    if (headers.includes('pmax')) out.pmax = center.join(' ');
    return out;
  }

  if (center.length === 2) {
    out.pmoy = center[0];
    out.pmax = center[1];
    return out;
  }

  // regrouper autour des 'x' si présents
  const groups = [];
  let cur = [];
  for (let k = 0; k < center.length; k++) {
    cur.push(center[k]);
    if (center[k].toLowerCase() === 'x' && k + 1 < center.length && /^\d+$/.test(center[k + 1])) {
      cur.push(center[k + 1]);
      groups.push(cur.join(' '));
      cur = [];
      k++;
    }
  }
  if (cur.length) groups.push(cur.join(' '));

  if (groups.length >= 2) {
    out.pmoy = groups[0];
    out.pmax = groups[1];
    return out;
  }

  // cas courant "Vig x N" ou "50 100" => essayer la séparation au milieu
  const mid = Math.ceil(center.length / 2);
  out.pmoy = center.slice(0, mid).join(' ');
  out.pmax = center.slice(mid).join(' ');
  return out;
}

function nettoyerResistances(str) {
  return str
    // Coller "Rés." avec le type (ex: "Rés.phys.")
    .replace(/Rés\.\s*([A-Za-zÉéèêÊûÛôÔïÏçÇ]+)\./gi, 'Rés.$1.')
    // Remplacer les "--" par "0 " (avec espace)
    .replace(/--\s*/g, '0 ')
    // Supprimer les espaces autour des opérateurs + ou -
    .replace(/([+\-])\s*/g, '$1')
    // Supprimer les espaces après "1d8"
    .replace(/1d8\s*/g, '1d8');
}

// 6) Parser une ligne groupée en utilisant les utilitaires
function parseGroupedLine(rawLine, headers) {
  console.log(rawLine);
  const line = nettoyerResistances(rawLine);
  console.log(line);
  const parts = line.split(/\s+/);
  const firstNumericIndex = parts.findIndex(p => isInteger(p));
  const name = firstNumericIndex > 0 ? parts.slice(0, firstNumericIndex).join(' ') : parts[0];
  let values = parts.slice(firstNumericIndex);

  values = mergeFragments(values);

  const obj = { name };
  let vi = 0;

  obj.enc = values[vi++] ?? null;

  // cd: "1d8" or "1d8 + N"
  if (values[vi + 1] === '+' && values[vi + 2]) {
    obj.cd = `${values[vi]} + ${values[vi + 2]}`;
    vi += 3;
  } else {
    obj.cd = values[vi] ?? null;
    vi += 1;
  }

  obj.dur = values[vi++] ?? null;

  const rem = values.slice(vi);
  const out = {};

  // cout = last token
  out.cout = rem.length ? rem[rem.length - 1] : null;

  // mun detection (penche vers rem[-2] si pattern)
  const munCandidate = rem.length >= 2 ? rem[rem.length - 2] : null;
  if (munCandidate && isMun(munCandidate)) {
    out.mun = munCandidate;
    var center = rem.slice(0, rem.length - 2);
  } else if (headers.includes('mun') && rem.length >= 3) {
    out.mun = munCandidate;
    var center = rem.slice(0, rem.length - 2);
  } else {
    out.mun = null;
    var center = rem.slice(0, rem.length - 1);
  }

  const pm = splitPmoyPmax(center, headers);
  out.pmoy = pm.pmoy;
  out.pmax = pm.pmax;

  obj.pmoy = out.pmoy ?? '';
  obj.pmax = out.pmax ?? '';
  obj.mun = out.mun ?? '';
  obj.cost = out.cout ?? '';

  return obj;
}

function normalizeName(str) {
  return str
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // retire accents
    .replace(/['’]/g, "'") // unifie apostrophes
    .replace(/\s+/g, " ") // espaces multiples → simple espace
    .trim();
}

// Fonction principale orchestratrice
function parseFlexibleTableSmart(tableString) {
  const rawLines = tableString.replace(/\r/g, '').split('\n');
  const headerLineIndex = findHeaderLineIndex(rawLines);
  const headerLine = rawLines[headerLineIndex].trim();
  const headers = buildHeaders(headerLine);
  const expectedFields = headers.length;
  //const grouped = groupDataLines(rawLines, headerLineIndex, expectedFields);
  return grouped.map(line => parseGroupedLine(line, headers));
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
  
  t = cleanPunctuation(t);
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

function cleanPunctuation(text) {
  return text.replace(/ \./g, '.').replace(/ ,/g, ',');
}

function extractSpecs(line, item)
{
  const patterns = [
    { regex: /D[ée]g[aâ]ts\s*:\s*([^\n]+)/i, key: "degat" },
    { regex: /Cible :\s*([^\n]+)/i, key: "cible" },
    { regex: /Durée\s*:\s*([^\n]+)/i, key: "duree" },
    { regex: /Co[uû]t\s*:\s*(\d+)/i, key: "cost" },
    { regex: /Coût en PM :\s*(\d+)/i, key: "costPm" },
    { regex: /Coût en PM total :\s*(\d+)/i, key: "costTotal" },
    { regex: /Coût en PM par participant :\s*(\d+)/i, key: "costMulti" },
    { regex: /Nombre recommandé de participants :\s*(\d+)/i, key: "participants" },
    { regex: /Degr[ée] de Difficult[ée] :\s*([^\n]+)/i, key: "dd" },
    { regex: /• (.*?) : /i, key: "name" },
  ];

  let matched = false;

  for (const { regex, key } of patterns) {
    const match = line.match(regex);
    if (match) {
      item[key] = match[1];
      if(key != "name")
        matched = true;
      break;
    }
  }

  if (!matched) {
    item.body += line + '\n';
  }
}


function isCategorie(line)
{
  const patterns = [
    "Armes contondantes",
    "Dagues",
    "Épées et sabres",
    "Haches",
    "Armes de trait",
    "Armes à feu",
    "Lances",
    "Armes de jet",
    "Armes à distance",
    "Armes à distance au corps à corps",
    "Variantes enchantées",
    "Accessoires",
    "Boucliers",
    "Armures lourdes",
    "Armures légères"
  ];
  return patterns.some(pattern => pattern == line);
}

/** Construit le HTML final attendu. */
function buildHtmlDescription(element) {
  const parts = [];

  const fields = [
    { key: "categorie", label: null, strongOnly: true },
    { key: "active", label: null, strongOnly: true },
    { key: "cost", label: "Coût :" },
    { key: "cible", label: "Cible :" },
    { key: "duree", label: "Durée :", lowerCase: true },
    { key: "costPm", label: "Coût en PM:" },
    { key: "costTotal", label: "Coût total en PM :" },
    { key: "costMulti", label: "Coût pour chaque participants en PM :" },
    { key: "paticipants", label: "Nombre recommandé de participants :" },
    { key: "degat", label: "Dégâts :" },
    { key: "effetText", label: "Effet :" },
    { key: "dd", label: "Degré de difficulté :" },
    { key: "descText", label: null },
    { key: "exText", label: "Exemple :" },
    { key: "pmoy", label: "Portée Moyenne :" },
    { key: "pmax", label: "Portée Maximum :" },
    { key: "mun", label: "Munitions :" },
    { key: "enc", label: "Encombrement :" },
    { key: "dur", label: "Durabilité :" },
    { key: "cd", label: "Dégâts :" },
    { key: "cp", label: "Code de protection :" },
    { key: "modrap", label: "Modificateur de rapidité :" }
  ];

  for (const { key, label, strongOnly, lowerCase } of fields) {
    const value = element[key];
    if (!value) continue;

    let escaped;

    if(lowerCase)
      escaped = escapeHtml(value.toLowerCase());
    else
      escaped = escapeHtml(value);

    if (strongOnly) {
      parts.push(`<p><strong>${escaped}</strong></p>`);
    } else if (label) {
      parts.push(`<p><strong>${label}</strong> ${escaped}</p>`);
    } else {
      parts.push(`<p>${escaped}</p>`);
    }
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
    await foundry.documents.collections.CompendiumCollection.createCompendium({
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
  return pack;
}

async function fillCompendium(pack, item) {
  // Vérifie si un document avec le même nom existe déjà
  const existing = pack.index.find(e => e.name === item.name);
  if (existing) {
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

async function createCompendiumArmes(text)
{
    await parseArmesFromText(text);
}

async function createCompendiumArmures(text)
{
    await parseArmuresFromText(text);
}

export async function prepareCompendiumWithPDF(text) {
    await createCompendiumTraits(text);
    await createCompendiumSkills(text);
    await createCompendiumSpells(text);
    await createCompendiumArmes(text);
    await createCompendiumArmures(text);
}
