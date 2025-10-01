const loadTemplates = foundry.applications.handlebars.loadTemplates;

/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
  return loadTemplates([
    // Actor partials.
    'systems/fvtt-lore-legacy/templates/actor/parts/actor-features.hbs',
    'systems/fvtt-lore-legacy/templates/actor/parts/actor-skills.hbs',
    'systems/fvtt-lore-legacy/templates/actor/parts/actor-capacites.hbs',
    'systems/fvtt-lore-legacy/templates/actor/parts/actor-traits.hbs',
    'systems/fvtt-lore-legacy/templates/actor/parts/actor-items.hbs',
    'systems/fvtt-lore-legacy/templates/actor/parts/actor-spells.hbs',
    'systems/fvtt-lore-legacy/templates/actor/parts/actor-effects.hbs',
    // Item partials
    'systems/fvtt-lore-legacy/templates/item/parts/item-effects.hbs',
    'systems/fvtt-lore-legacy/templates/pdfrules-form.hbs',
  ]);
};
