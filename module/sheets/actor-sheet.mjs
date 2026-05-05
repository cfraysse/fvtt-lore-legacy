import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from '../helpers/effects.mjs';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * Feuille d’acteur Lore Legacy (V2 compatible Foundry 14.0.x)
 */
export class LoreLegacyActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  constructor(options={}) {
    super(options);/*
    this.#documentId = options.document.id;
    this.#documentType = options.document.metadata.name;
    this.#item = options.document.item;*/
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["pseudo-document", "sheet", "standard-form"],
    tag: "form",
    document: null,
    viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED,
    editPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
    actions: {
    },
    form: {
      submitOnChange: true
    }
  };
  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The PseudoDocument associated with this application.
   * @type {PseudoDocument}
   */
  get document() {
    return this;
    //return this.item.getEmbeddedDocument(this.#documentType, this.#documentId);
  }

  /**
   * ID of this PseudoDocument on the parent item.
   * @type {string}
   */
  #documentId;

  /**
   * Collection representing this PseudoDocument.
   * @type {string}
   */
  #documentType;

  /* -------------------------------------------- */

  /**
   * Parent item to which this PseudoDocument belongs.
   * @type {Item5e}
   */
  #item;

  get item() {
    return this.#item;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /* -------------------------------------------- */

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */


  /** @override */
  static get defaultOptions() {
    return {
      id: "lorelegacy-actor-sheet",
      classes: ["fvtt-lore-legacy", "sheet", "actor"],
      window: { frame: true },
      width: 600,
      height: 600,
      template: "systems/fvtt-lore-legacy/templates/actor/actor-sheet.hbs",
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "features"
        }
      ]
    };
  }

  /** Obligatoire pour les feuilles V2 
  get document() {
    //return this.object;
  }
*/
  /** @override */
  async getData(options = {}) {
    const context = await super.getData(options);

    // Template réel (character / npc)
    context.template = `systems/fvtt-lore-legacy/templates/actor/actor-${this.document.type}-sheet.hbs`;

    // Données d’acteur
    const actorData = this.document.toObject(false);
    context.system = actorData.system;
    context.flags = actorData.flags;
    context.config = CONFIG.LORE_LEGACY;

    // Items + préparation
    if (actorData.type === "character") {
      this._prepareItems(context);
      this._prepareCharacterData(context);
    }
    if (actorData.type === "npc") {
      this._prepareItems(context);
    }

    // Biographie enrichie
    context.enrichedBiography =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.document.system.biography,
        {
          secrets: this.document.isOwner,
          async: true,
          rollData: this.document.getRollData(),
          relativeTo: this.document
        }
      );

    // Effets actifs
    context.effects = prepareActiveEffectCategories(
      this.document.allApplicableEffects()
    );

    return context;
  }

  async _onDrop(event) {
    event.preventDefault();

    const data = TextEditor.getDragEventData(event);

    if (data.type !== "Item") {
      return super._onDrop(event);
    }

    const sourceItem = await Item.implementation.fromDropData(data);
    if (!sourceItem) return;

    const fromActor = sourceItem.parent?.id ?? null;
    const fromItem  = sourceItem.id ?? null;

    console.log("onDrop", fromItem, fromActor);

    const itemData = sourceItem.toObject();
    delete itemData._id;

    itemData.flags = itemData.flags || {};
    itemData.flags["fvtt-lore-legacy"] = {
      fromActor,
      fromItem
    };

    return this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  _prepareCharacterData(context) {
    // à remplir si besoin, comme avant
  }

  _prepareItems(context) {
    const gear = [];
    const features = [];
    const traits = [];
    const skills = [];
    let capsecs = [];
    const spells = [];

    for (let i of context.items) {
      i.img = i.img || Item.DEFAULT_ICON;

      if (i.type === 'item') gear.push(i);
      else if (i.type === 'feature') features.push(i);
      else if (i.type === 'trait') traits.push(i);
      else if (i.type === 'skill') skills.push(i);
      else if (i.type === 'capsec') capsecs.push(i);
      else if (i.type === 'spell') spells.push(i);
    }

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

    for (const name in grouped) {
      const list = grouped[name];
      for (let i = 1; i < list.length; i++) {
        toDelete.push(list[i].id);
      }
    }

    for (const expectedName of EXPECTED) {
      const found = capsecs.find(c => c.name === expectedName);
      if (!found) {
        toCreate.push(expectedName);
      }
    }

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

    this._fixingCapsecs = false;

    if (existingToDelete.length > 0 || toCreate.length > 0) {
      this.render(false);
    }
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.on('click', '.cap-edit', (ev) => {
      const li = $(ev.currentTarget).parents('.cap');
      const capacite = this.actor.capacites.get(li.data('capId'));
      capacite.sheet.render(true);
    });

    html.on('click', '.item-edit', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      item.sheet.render(true);
    });

    if (!this.isEditable) return;

    html.on('click', '.item-create', this._onItemCreate.bind(this));

    html.on('click', '.item-delete', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });

    html.on('click', '.effect-control', (ev) => {
      const row = ev.currentTarget.closest('li');
      const document =
        row.dataset.parentId === this.actor.id
          ? this.actor
          : this.actor.items.get(row.dataset.parentId);
      onManageActiveEffect(ev, document);
    });

    html.on('click', '.rollable', this._onRoll.bind(this));

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

  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const type = header.dataset.type;
    let img;

    if (type === "skill") {
      img = "systems/fvtt-lore-legacy/assets/skills.png";
    }
    else if (type === "capsec") {
      img = "systems/fvtt-lore-legacy/assets/checkbox-tree.png";
    }
    else if (type === "trait") {
      img = "systems/fvtt-lore-legacy/assets/aura.png";
    }
    else {
      img = "systems/fvtt-lore-legacy/assets/swap-bag.png";
    }

    const data = duplicate(header.dataset);
    const name = `New ${type.capitalize()}`;

    const itemData = {
      name,
      type,
      system: data,
      img
    };

    delete itemData.system['type'];

    return await Item.create(itemData, { parent: this.actor });
  }

  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    if (dataset.rollType) {
      if (dataset.rollType === 'item') {
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();
      }
    }

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

  /**
 * Actions performed after any render of the Application.
 * Post-render steps are not awaited by the render process.
 * @param {ApplicationRenderContext} context      Prepared context data
 * @param {RenderOptions} options                 Provided render options
 * @protected
 */
  _onRender(context, options) {
        // Inputs with class `item-quantity`
    const itemQuantities = this.element.querySelectorAll('.item-quantity')
    for (const input of itemQuantities) {
      // keep in mind that if your callback is a named function instead of an arrow function expression
      // you'll need to use `bind(this)` to maintain context
      input.addEventListener("change", (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        const newQuantity = e.currentTarget.value
        // assuming the item's ID is in the input's `data-item-id` attribute
        const itemId = e.currentTarget.dataset.itemId
        const item = this.actor.items.get(itemId)
        // the following is asynchronous and assumes the quantity is in the path `system.quantity`
        item.update({ system: { quantity: newQuantity }});
      })
    }
  }
}
