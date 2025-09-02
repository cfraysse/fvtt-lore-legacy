// Import document classes.
import { LoreLegacyActor } from './documents/actor.mjs';
import { LoreLegacyItem } from './documents/item.mjs';
import { prepareCompendiumWithPDF } from './documents/pdf.mjs';

// Import sheet classes.
import { LoreLegacyActorSheet } from './sheets/actor-sheet.mjs';
import { LoreLegacyItemSheet } from './sheets/item-sheet.mjs';
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { LORE_LEGACY } from './helpers/config.mjs';


/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', function () {
  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.fvttlorelegacy = {
    LoreLegacyActor,
    LoreLegacyItem,
    rollItemMacro,
  };

  // Add custom constants for configuration.
  CONFIG.LORE_LEGACY = LORE_LEGACY;

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: '1d6 + @abilities.mai.mod',
    decimals: 2,
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = LoreLegacyActor;
  CONFIG.Item.documentClass = LoreLegacyItem;

  // Active Effects are never copied to the Actor,
  // but will still apply to the Actor from within the Item
  // if the transfer property on the Active Effect is true.
  CONFIG.ActiveEffect.legacyTransferral = false;

  // Register sheet application classes
  Actors.unregisterSheet('core', ActorSheet);
  Actors.registerSheet('fvtt-lore-legacy', LoreLegacyActorSheet, {
    makeDefault: true,
    label: 'LORE_LEGACY.SheetLabels.Actor',
  });
  Items.unregisterSheet('core', ItemSheet);
  Items.registerSheet('fvtt-lore-legacy', LoreLegacyItemSheet, {
    makeDefault: true,
    label: 'LORE_LEGACY.SheetLabels.Item',
  });

  // Votre setting tel quel
  game.settings.register("fvtt-lore-legacy", "PDFrules", {
    name: "SETTINGS.LORE_LEGACY.RULES.pdf.name",
    hint: "SETTINGS.LORE_LEGACY.RULES.pdf.hint",
    scope: "world",
    config: true,
    onChange: value => { 
      prepareCompendiumWithPDF(value);
    },
    requiresReload: false,
    type: String,
    filePicker: false
  });

  // Hook: convertir l'input en textarea lors de l’ouverture des paramètres
  Hooks.on("renderSettingsConfig", (app, html, data) => {
    const moduleKey = "fvtt-lore-legacy.PDFrules";
    const input = html[0].querySelector(`input[name="${moduleKey}"]`);
    if (!input) return;

    const ta = document.createElement("textarea");
    ta.name = moduleKey;
    ta.rows = 8;           // Ajustez le nombre de lignes
    ta.style.width = "100%";
    ta.value = input.value ?? "";

    // Copier les attributs utiles (placeholder, etc.)
    if (input.placeholder) ta.placeholder = input.placeholder;

    // Remplacer dans le DOM
    input.replaceWith(ta);
  });

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here is a useful example:
Handlebars.registerHelper('toLowerCase', function (str) {
  return str.toLowerCase();
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once('ready', function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on('hotbarDrop', (bar, data, slot) => createItemMacro(data, slot));
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== 'Item') return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn(
      'You can only create macro buttons for owned Items'
    );
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `game.fvttlorelegacy.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(
    (m) => m.name === item.name && m.command === command
  );
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: 'script',
      img: item.img,
      command: command,
      flags: { 'fvtt-lore-legacy.itemMacro': true },
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: 'Item',
    uuid: itemUuid,
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then((item) => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(
        `Could not find item ${itemName}. You may need to delete and recreate this macro.`
      );
    }

    // Trigger the item roll
    item.roll();
  });
}
