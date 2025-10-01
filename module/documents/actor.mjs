/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class LoreLegacyActor extends Actor {
  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
  }

  /**
   * @override
   * Augment the actor source data with additional dynamic data. Typically,
   * you'll want to handle most of your calculated/derived data in this step.
   * Data calculated in this step should generally not exist in template.json
   * (such as ability modifiers rather than ability scores) and should be
   * available both inside and outside of character sheets (such as if an actor
   * is queried and has a roll executed directly from it).
   */
  prepareDerivedData() {
    const actorData = this;
    const systemData = actorData.system;
    const flags = actorData.flags.fvttlorelegacy || {};

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    this._prepareCharacterData(actorData);
    this._prepareNpcData(actorData);
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    if (actorData.type !== 'character') return;

    // Make modifications to data here. For example:
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
      // Lore & legacy add value of ability to d6.
      ability.mod = ability.value;
      if (ability.bfortune == true) {
        ability.nfortune = 1;
        ability.cfortune = "checked";
      }
      else {
        if(systemData.attributes.bfortune == true) {
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
        if(systemData.attributes.badversite == true) {
          ability.nadversite = 1;
        }
        else {
          ability.nadversite = 0;
        }
        ability.cadversite = "unchecked";
      }
    }
/*
    for (let [key, skill] of Object.entries(systemData.skills)) {

      //skill.prepareTriangle(systemData.attributes.badversite, systemData.attributes.bfortune);
      // TODO ??? skill.prepareTriangle(systemData.attributes.badversite, systemData.attributes.bfortune)
      // Lore & legacy add value of skill to d10.
    }

    for (let [key, capsec] of Object.entries(systemData.capsecs)) {

      // TODO
    }
*/
  }

  /**
   * Prepare NPC type specific data.
   */
  _prepareNpcData(actorData) {
    if (actorData.type !== 'npc') return;

    // Make modifications to data here. For example:
    const systemData = actorData.system;
    systemData.xp = systemData.cr * systemData.cr * 100;
  }

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    // Starts off by populating the roll data with a shallow copy of `this.system`
    const data = { ...this.system };

    // Prepare character roll data.
    this._getCharacterRollData(data);
    this._getNpcRollData(data);

    return data;
  }

  /**
   * Prepare character roll data.
   */
  _getCharacterRollData(data) {
    if (this.type !== 'character') return;

    // Copy the ability scores to the top level, so that rolls can use
    // formulas like `@vig.mod + 4`.
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
    // Add level for easier access, or fall back to 0.
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

    // Process additional NPC data here.
  }

  getNFortune() {
    return this.system.nfortune;
  }

  getNAdversite() {
    return this.system.nadversite;
  }
}
