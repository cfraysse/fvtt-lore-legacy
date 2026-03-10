/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class LoreLegacyActor extends Actor {
  /** @override */
  prepareData() {
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
  }

  /**
   * @override
   * Augment the actor source data with additional dynamic data.
   */
  prepareDerivedData() {
    const actorData = this;
    const systemData = actorData.system;
    const flags = actorData.flags.fvttlorelegacy || {};

    // Données spécifiques au type
    this._prepareCharacterData(actorData);
    this._prepareNpcData(actorData);

    // 🔢 Calcul automatique du bagage (poids total de l'inventaire)
    if (systemData?.bagage) {
      let totalWeight = 0;

      for (const item of this.items) {
        const itemSystem = item.system ?? {};
        const qty = Number(itemSystem.quantity ?? 1);
        const weight = Number(itemSystem.weight ?? 0);

        if (!Number.isNaN(qty) && !Number.isNaN(weight)) {
          totalWeight += qty * weight;
        }
      }

      systemData.bagage.value = totalWeight;
    }
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    if (actorData.type !== 'character') return;

    const systemData = actorData.system;

    if (systemData.attributes.bfortune == true) {
      systemData.attributes.nfortune = 1;
      systemData.attributes.cfortune = "checked";
    }
    else {
      systemData.attributes.nfortune = 0;
      systemData.attributes.cfortune = "unchecked";
    }

    if (systemData.attributes.badversite == true) {
      systemData.attributes.nadversite = 1;
      systemData.attributes.cadversite = "checked";
    }
    else {
      systemData.attributes.nadversite = 0;
      systemData.attributes.cadversite = "unchecked";
    }

    // Loop through ability scores, and add their modifiers to our sheet output.
    for (let [key, ability] of Object.entries(systemData.abilities)) {
      ability.mod = ability.value;

      if (ability.bfortune == true) {
        ability.nfortune = 1;
        ability.cfortune = "checked";
      }
      else {
        if (systemData.attributes.bfortune == true) {
          ability.nfortune = 1;
        }
        else {
          ability.nfortune = 0;
        }
        ability.cfortune = "unchecked";
      }

      if (ability.badversite == true) {
        ability.nadversite = 1;
        ability.cadversite = "checked";
      }
      else {
        if (systemData.attributes.badversite == true) {
          ability.nadversite = 1;
        }
        else {
          ability.nadversite = 0;
        }
        ability.cadversite = "unchecked";
      }
    }
  }

  /**
   * Prepare NPC type specific data.
   */
  _prepareNpcData(actorData) {
    if (actorData.type !== 'npc') return;

    const systemData = actorData.system;
    systemData.xp = systemData.cr * systemData.cr * 100;
  }

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    const data = { ...this.system };

    this._getCharacterRollData(data);
    this._getNpcRollData(data);

    return data;
  }

  /**
   * Prepare character roll data.
   */
  _getCharacterRollData(data) {
    if (this.type !== 'character') return;

    if (data.abilities) {
      for (let [k, v] of Object.entries(data.abilities)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    if (data.spells) {
      for (let [k, v] of Object.entries(data.spells)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    if (data.skills) {
      for (let [k, v] of Object.entries(data.skills)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    if (data.attributes.level) {
      data.lvl = data.attributes.level.value ?? 0;
    }

    if (data.attributes) {
      for (let [k, v] of Object.entries(data.attributes)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }
  }

  /**
   * Prepare NPC roll data.
   */
  _getNpcRollData(data) {
    if (this.type !== 'npc') return;
  }

  getNFortune() {
    return this.system.nfortune;
  }

  getNAdversite() {
    return this.system.nadversite;
  }
}
