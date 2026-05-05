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
    const context = super.getData();

    const actorData = this.document.toObject(false);

    context.system = actorData.system;
    context.flags = actorData.flags;

    context.config = CONFIG.LORE_LEGACY;

    if (actorData.type == 'character') {
      this._prepareItems(context);
      this._prepareCharacterData(context);
    }

    if (actorData.type == 'npc') {
      this._prepareItems(context);
    }

    context.enrichedBiography = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      this.actor.system.biography,
      {
        secrets: this.document.isOwner,
        async: true,
        rollData: this.actor.getRollData(),
        relativeTo: this.actor,
      }
    );

    context.effects = prepareActiveEffectCategories(
      this.actor.allApplicableEffects()
    );

    return context;
  }

  /**
   * Character-specific context modifications
   */
  _prepareCharacterData(context) {
    // Placeholder for future character-specific logic
  }

  /**
   * Organize and classify Items for Actor sheets.
   */
  _prepareItems(context) {
    const gear = [];
    const features = [];
    const traits = [];
    const skills = [];
    var capsecs = [];
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

    // 🔥 LISTE CORRIGÉE DES CAPSECS ATTENDUES
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

    // Doublons → garder la première
    for (const name in grouped) {
      const list = grouped[name];
      for (let i = 1; i < list.length; i++) {
        toDelete.push(list[i].id);
      }
    }

    // Capsecs manquantes
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

    html.on('click', '.recalc-values', async (ev) => {
      ev.preventDefault();
      await this.actor.recalculateDerivedValues();
      ui.notifications.info("Valeurs recalculées !");
      this.render(false);
    });

    if (this._fixingCapsecs) return;
    this._fixingCapsecs = true;

    setTimeout(() => this._fixCapsecsSafe(), 10);
  }

  /**
   * Handle creating a new Owned Item
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;

    const type = header.dataset.type;
    let img;

    if (type === "skill") img = "systems/fvtt-lore-legacy/assets/skills.png";
    else if (type === "capsec") img = "systems/fvtt-lore-legacy/assets/checkbox-tree.png";
    else if (type === "trait") img = "systems/fvtt-lore-legacy/assets/aura.png";
    else img = "systems/fvtt-lore-legacy/assets/swap-bag.png";

    const data = duplicate(header.dataset);
    const name = `New ${type.capitalize()}`;

    const itemData = {
      name: name,
      type: type,
      system: data,
      img: img,
    };

    delete itemData.system['type'];

    return await Item.create(itemData, { parent: this.actor });
  }

  /**
   * Handle clickable rolls.
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    if (dataset.rollType) {
      if (dataset.rollType == 'item') {
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
}
