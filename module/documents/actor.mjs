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
  prepareBaseData() {}

  /**
   * @override
   * Augment the actor source data with additional dynamic data.
   */
  prepareDerivedData() {
    const actorData = this;
    const systemData = actorData.system;

    // Données spécifiques au type
    this._prepareCharacterData(actorData);
    this._prepareNpcData(actorData);

    // ---------------------------------------------------------------------
    // 🔢 CALCUL AUTOMATIQUE DU BAGAGE
    // ---------------------------------------------------------------------
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

    // ---------------------------------------------------------------------
    // 🔥 CALCUL AUTOMATIQUE DES CAPACITÉS SECONDAIRES
    // ---------------------------------------------------------------------

    const capsecs = this.items.filter(i => i.type === "capsec");

    // Raccourci pour récupérer une valeur d’attribut
    const A = (attr) => Number(this.system.abilities?.[attr]?.value ?? 0);

    // Récupérer une capsec par son nom localisé
    const getCap = (label) =>
      capsecs.find(c => c.name === game.i18n.localize(label));

    // Récupérer la compétence Endurance (si elle existe)
    const endurance = this.items.find(i => i.type === "skill" && i.name === "Endurance");
    const ENDURANCE_VALUE = endurance ? Number(endurance.system?.skillLevel ?? 0) : 0;

    // Formules des capsecs (sans Poids, sans RDC)
    const FORMULAS = {
      "LORE_LEGACY.CapSec.ResPhys": () => A("rob") * 3,
      "LORE_LEGACY.CapSec.ResMag": () => (A("dis") + A("mai")) * 2,
      "LORE_LEGACY.CapSec.ResMent": () => (A("car") + A("pre")) * 2,
      "LORE_LEGACY.CapSec.SeuilBlessure": () => A("rob") * 2 + ENDURANCE_VALUE,
      "LORE_LEGACY.CapSec.Rapidite": () => A("mai") + A("vig")
      // Poids = laissé au joueur → pas de formule
    };

    // Application des formules
    for (const key in FORMULAS) {
      const cap = getCap(key);
      if (cap) {
        const newValue = FORMULAS[key]();
        if (cap.system.capsecLevel !== newValue) {
          cap.update({ "system.capsecLevel": newValue });
        }
      }
    }

    // ---------------------------------------------------------------------
    // 🔥 CALCUL AUTOMATIQUE DES VALEURS MAX : PV, PM, RDC
    // ---------------------------------------------------------------------

    if (systemData.health) {
      systemData.health.max = (A("rob") + A("vig")) * 2;
      if (systemData.health.value > systemData.health.max) {
        systemData.health.value = systemData.health.max;
      }
    }

    if (systemData.power) {
      systemData.power.max = (A("car") + A("dis"));
      if (systemData.power.value > systemData.power.max) {
        systemData.power.value = systemData.power.max;
      }
    }

    if (systemData.lastchance) {
      const FORTUNE = Number(systemData.fortune?.value ?? 0);
      systemData.lastchance.max = FORTUNE + A("vig");
      if (systemData.lastchance.value > systemData.lastchance.max) {
        systemData.lastchance.value = systemData.lastchance.max;
      }
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

    for (let [key, ability] of Object.entries(systemData.abilities)) {
      ability.mod = ability.value;

      if (ability.bfortune == true) {
        ability.nfortune = 1;
        ability.cfortune = "checked";
      }
      else {
        ability.nfortune = systemData.attributes.bfortune ? 1 : 0;
        ability.cfortune = "unchecked";
      }

      if (ability.badversite == true) {
        ability.nadversite = 1;
        ability.cadversite = "checked";
      }
      else {
        ability.nadversite = systemData.attributes.badversite ? 1 : 0;
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
