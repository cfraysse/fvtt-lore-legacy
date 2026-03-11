import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from '../helpers/effects.mjs';

const ActorSheet = foundry.appv1.sheets.ActorSheet;

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class LoreLegacyActorSheet extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['fvtt-lore-legacy', 'sheet', 'actor'],
      width: 600,
      height: 600,
      tabs: [
        {
          navSelector: '.sheet-tabs',
          contentSelector: '.sheet-body',
          initial: 'features',
        },
      ],
    });
  }

  async _onDrop(event) {
    event.preventDefault();

    const data = TextEditor.getDragEventData(event);

    // On ne traite que les items
    if (data.type !== "Item") {
      return super._onDrop(event);
    }

    // Récupérer l’item source (celui qu’on glisse)
    const sourceItem = await Item.implementation.fromDropData(data);
    if (!sourceItem) return;

    const fromActor = sourceItem.parent?.id ?? null;
    const fromItem  = sourceItem.id ?? null;

    console.log("onDrop", fromItem, fromActor);

    // On part des vraies données de l'item source
    const itemData = sourceItem.toObject();

    // On enlève l'id pour que Foundry crée un nouvel item
    delete itemData._id;

    // On ajoute nos infos dans les flags
    itemData.flags = itemData.flags || {};
    itemData.flags["fvtt-lore-legacy"] = {
      fromActor,
      fromItem
    };  

    // Création standard dans l'acteur cible
    return this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  /** @override */
  get template() {
    return `systems/fvtt-lore-legacy/templates/actor/actor-${this.actor.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = this.document.toObject(false);

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;

    // Adding a pointer to CONFIG.LORE_LEGACY
    context.config = CONFIG.LORE_LEGACY;

    // Prepare character data and items.
    if (actorData.type == 'character') {
      this._prepareItems(context);
      this._prepareCharacterData(context);
    }

    // Prepare NPC data and items.
    if (actorData.type == 'npc') {
      this._prepareItems(context);
    }

    // Enrich biography info for display
    // Enrichment turns text like `[[/r 1d20]]` into buttons
    context.enrichedBiography = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      this.actor.system.biography,
      {
        // Whether to show secret blocks in the finished html
        secrets: this.document.isOwner,
        // Necessary in v11, can be removed in v12
        async: true,
        // Data to fill in for inline rolls
        rollData: this.actor.getRollData(),
        // Relative UUID resolution
        relativeTo: this.actor,
      }
    );

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(
      // A generator that returns all effects stored on the actor
      // as well as any items
      this.actor.allApplicableEffects()
    );

    return context;
  }

  /**
   * Character-specific context modifications
   *
   * @param {object} context The context object to mutate
   */
  _prepareCharacterData(context) {
    // This is where you can enrich character-specific editor fields
    // or setup anything else that's specific to this type
  }

  /**
   * Organize and classify Items for Actor sheets.
   *
   * @param {object} context The context object to mutate
   */
  _prepareItems(context) {
    // Initialize containers.
    const gear = [];
    const features = [];
    const traits = [];
    const skills = [];
    var capsecs = [];
    const spells = [];

    // Iterate through items, allocating to containers
    for (let i of context.items) {
      i.img = i.img || Item.DEFAULT_ICON;
      // Append to gear.
      if (i.type === 'item') {
        gear.push(i);
      }
      // Append to features.
      else if (i.type === 'feature') {
        features.push(i);
      }
      // Append to traits.
      else if (i.type === 'trait') {
        traits.push(i);
      }
      // Append to skills.
      else if (i.type === 'skill') {
        skills.push(i);
      }
      // Append to capsecs.
      else if (i.type === 'capsec') {
        capsecs.push(i);
      }
      // Append to spells.
      else if (i.type === 'spell') {
        spells.push(i);
      }
    }

    // Assign and return
    context.gear = gear;
    context.features = features;
    context.traits = traits;
    context.skills = skills;
    context.spells = spells;
    context.capsecs = capsecs;
  }

async _fixCapsecsSafe() {
    const actor = this.actor;

    const EXPECTED = [
      game.i18n.localize('LORE_LEGACY.CapSec.ResPhys'),
      game.i18n.localize('LORE_LEGACY.CapSec.ResMent'),
      game.i18n.localize('LORE_LEGACY.CapSec.ResMag'),
      game.i18n.localize('LORE_LEGACY.CapSec.SeuilBlessure'),
      game.i18n.localize('LORE_LEGACY.CapSec.Poids'),
      game.i18n.localize('LORE_LEGACY.CapSec.Rapidite')
    ];

    const capsecs = actor.items.filter(i => i.type === "capsec");

    const grouped = {};
    for (const cap of capsecs) {
      if (!grouped[cap.name]) grouped[cap.name] = [];
      grouped[cap.name].push(cap);
    }

    const toDelete = [];
    const toCreate = [];

    // Doublons → garder la première, marquer les autres
    for (const name in grouped) {
      const list = grouped[name];
      for (let i = 1; i < list.length; i++) {
        toDelete.push(list[i].id);
      }
    }

    // Manquantes
    for (const expectedName of EXPECTED) {
      const found = capsecs.find(c => c.name === expectedName);
      if (!found) {
        toCreate.push(expectedName);
      }
    }

    // Ne supprimer que les IDs encore existants
    const existingToDelete = toDelete.filter(id => actor.items.get(id));

    if (existingToDelete.length > 0) {
      await actor.deleteEmbeddedDocuments("Item", existingToDelete);
    }

    for (const name of toCreate) {
      await actor.createEmbeddedDocuments("Item", [{
        name,
        type: "capsec",
        img: "systems/fvtt-lore-legacy/assets/checkbox-tree.png",
        system: { capsecLevel: 0 }
      }]);
    }

    // On relâche le verrou
    this._fixingCapsecs = false;

    if (existingToDelete.length > 0 || toCreate.length > 0) {
      this.render(false);
    }
  }


  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Render the item sheet for viewing/editing prior to the editable check.
    html.on('click', '.cap-edit', (ev) => {
      const li = $(ev.currentTarget).parents('.cap');
      const capacite = this.actor.capacites.get(li.data('capId'));
      capacite.sheet.render(true);
    });
    
    // Render the item sheet for viewing/editing prior to the editable check.
    html.on('click', '.item-edit', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      item.sheet.render(true);
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    html.on('click', '.item-create', this._onItemCreate.bind(this));

    // Delete Inventory Item
    html.on('click', '.item-delete', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });

    // Active Effect management
    html.on('click', '.effect-control', (ev) => {
      const row = ev.currentTarget.closest('li');
      const document =
        row.dataset.parentId === this.actor.id
          ? this.actor
          : this.actor.items.get(row.dataset.parentId);
      onManageActiveEffect(ev, document);
    });

    // Rollable abilities.
    html.on('click', '.rollable', this._onRoll.bind(this));

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = (ev) => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains('inventory-header')) return;
        li.setAttribute('draggable', true);
        li.addEventListener('dragstart', handler, false);
      });
    }

    if (this._fixingCapsecs) return;
    this._fixingCapsecs = true;

    setTimeout(() => this._fixCapsecsSafe(), 10);
  }




  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    var img;
    if(type === "skill")
    {
      img = "systems/fvtt-lore-legacy/assets/skills.png"
    }
    else if(type === "capsec")
    {
      img = "systems/fvtt-lore-legacy/assets/checkbox-tree.png"
    }
    else if(type === "trait")
    {
      img = "systems/fvtt-lore-legacy/assets/aura.png"
    }
    else
    {
      img = "systems/fvtt-lore-legacy/assets/swap-bag.png"
    }
    
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data,
      img: img,
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system['type'];

    // Finally, create the item!
    return await Item.create(itemData, { parent: this.actor });
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Handle item rolls.
    if (dataset.rollType) {
      if (dataset.rollType == 'item') {
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();
      }
    }

    // Handle rolls that supply the formula directly.
    if (dataset.roll) {
      let label = dataset.label ? `[ability] ${dataset.label}` : '';
      let roll = new Roll(dataset.roll, this.actor.getRollData());
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get('core', 'rollMode'),
      });
      return roll;
    }
  }
}
