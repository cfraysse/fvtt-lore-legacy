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
    // 🔢 CALCUL AUTOMATIQUE DU BAGAGE (base)
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

    // CapSecs
    const capsecs = this.items.filter(i => i.type === "capsec");
    const rap = capsecs.find(c => c.name === game.i18n.localize("LORE_LEGACY.CapSec.Rapidite"));
    systemData.attributes.initiative = rap.system.capsecLevel
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
  
  async recalculateDerivedValues() {

    const systemData = this.system;

    // ------------------------------------------------------------
    // Normalisation
    // ------------------------------------------------------------
    function normalizeEffectString(str) {
      return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
    }

    // ------------------------------------------------------------
    // Synonymes
    // ------------------------------------------------------------
    const synonyms = {
      // Résistance Physique
      "res phys": "resphys", "res phy": "resphys", "res.phys": "resphys",
      "res.physique": "resphys", "res physique": "resphys",
      "resistance physique": "resphys", "resistance phys": "resphys",
      "resistance phy": "resphys", "resphys": "resphys",
      "resistancephysique": "resphys",

      // Résistance Mentale
      "res ment": "resment", "res men": "resment", "res.ment": "resment",
      "res mentale": "resment", "res mental": "resment",
      "resistance mentale": "resment", "resistance mental": "resment",
      "resment": "resment", "resistancementale": "resment",

      // Résistance Magique
      "res mag": "resmag", "res ma": "resmag", "res.mag": "resmag",
      "res.magique": "resmag", "res magique": "resmag",
      "resistance magique": "resmag", "resistance mag": "resmag",
      "resmag": "resmag", "resistancemagique": "resmag",

      // Rapidité
      "rapidite": "rapidite", "rapide": "rapidite", "vitesse": "rapidite",
      "rap": "rapidite",

      // Seuil de Blessure
      "sb": "sb", "seuil blessure": "sb", "seuil de blessure": "sb",
      "seuilblessure": "sb", "blessure": "sb",

      // PV / PM / RDC
      "pv": "pv", "pvs": "pv", "points de vie": "pv",
      "pm": "pm", "pms": "pm", "points de magie": "pm",
      "rdc": "rdc", "reserve derniere chance": "rdc",
      "reserve de derniere chance": "rdc", "derniere chance": "rdc",

      // Bagage
      "bagage": "bagage", "poids": "bagage", "charge": "bagage",
      "capacite de charge": "bagage"
    };

    // ------------------------------------------------------------
    // Raccourci attributs
    // ------------------------------------------------------------
    const A = (attr) => Number(systemData.abilities?.[attr]?.value ?? 0);

    // ------------------------------------------------------------
    // Valeurs de base
    // ------------------------------------------------------------

        // CapSecs
    const endurance = this.items.find(i => i.type === "skill" && i.name === "Endurance");
    const ENDURANCE_VALUE = endurance ? Number(endurance.system?.skillLevel ?? 0) : 0;
    const concentration = this.items.find(i => i.type === "skill" && i.name === "Concentration");
    const CONCENTRATION_VALUE = concentration ? Number(concentration.system?.skillLevel ?? 0) : 0;
    const EspritCritique = this.items.find(i => i.type === "skill" && i.name === "Esprit Critique");
    const ESPRIT_CRITIQUE_VALUE = EspritCritique ? Number(EspritCritique.system?.skillLevel ?? 0) : 0;
    const mysticisme = this.items.find(i => i.type === "skill" && i.name === "Mysticisme");
    const MYSTICISME_VALUE = mysticisme ? Number(mysticisme.system?.skillLevel ?? 0) : 0;
    const optimisation = this.items.find(i => i.type === "skill" && i.name === "Optimisation");
    const OPTIMISATION_VALUE = optimisation ? Number(optimisation.system?.skillLevel ?? 0) : 0;
    const armurelegere = this.items.find(i => i.type === "skill" && i.name === "Armure Légère");
    const ARMURE_LEGERE_VALUE = armurelegere ? Number(armurelegere.system?.skillLevel ?? 0) : 0;
    const armurelourde = this.items.find(i => i.type === "skill" && i.name === "Armure Lourde");
    const ARMURE_LOURDE_VALUE = armurelourde ? Number(armurelourde.system?.skillLevel ?? 0) : 0;
    const esquive = this.items.find(i => i.type === "skill" && i.name === "Esquive");
    const ESQUIVE_VALUE = esquive ? Number(esquive.system?.skillLevel ?? 0) : 0;

    let basePV  = (A("rob") + A("vig")) * 2 + ENDURANCE_VALUE;
    let basePM  = (A("car") + A("dis")) + CONCENTRATION_VALUE + MYSTICISME_VALUE*2;
    let baseRDC = Number(systemData.fortune?.max ?? 0) + A("vig");

    let baseResPhys = A("rob") * 3 + ARMURE_LEGERE_VALUE + ARMURE_LOURDE_VALUE + ESQUIVE_VALUE;
    let baseResMag  = (A("dis") + A("mai")) * 2  + CONCENTRATION_VALUE;
    let baseResMent = (A("car") + A("pre")) * 2 + ESPRIT_CRITIQUE_VALUE;
    let baseSB      = A("rob") * 2 + ENDURANCE_VALUE;
    let baseRap     = A("mai") + A("vig");

    let baseBagage = 9 + OPTIMISATION_VALUE;

    // ------------------------------------------------------------
    // Bonus via effets
    // ------------------------------------------------------------
    let bonusResPhys = 0, bonusResMag = 0, bonusResMent = 0;
    let bonusPV = 0, bonusPM = 0, bonusRDC = 0;
    let bonusBagage = 0, bonusRap = 0, bonusSB = 0;

    for (const item of this.items) {
      let eff = item.system?.effects;
      if (!eff || typeof eff !== "string") continue;

      let txt = normalizeEffectString(eff);

      // Ignorer les effets contenant un jet
      if (txt.match(/\d+d\d+/)) continue;

      // Remplacer les synonymes
      for (const key in synonyms) {
        const value = synonyms[key];
        const regexSyn = new RegExp(key, "gi");
        txt = txt.replace(regexSyn, value);
      }

      // Motif générique : clé + nombre (positif ou négatif)
      const regex = /([a-z]+)\s*\.?\s*([+-])\s*(\d+)/gi;
      let match;

      while ((match = regex.exec(txt)) !== null) {
        const key = match[1];
        const sign = match[2] === "-" ? -1 : 1;
        const value = Number(match[3]) * sign;

        switch (key) {
          case "resphys": bonusResPhys += value; break;
          case "resment": bonusResMent += value; break;
          case "resmag":  bonusResMag  += value; break;
          case "pv":      bonusPV      += value; break;
          case "pm":      bonusPM      += value; break;
          case "rdc":     bonusRDC     += value; break;
          case "bagage":  bonusBagage  += value; break;
          case "rapidite":bonusRap     += value; break;
          case "sb":      bonusSB      += value; break;
        }
      }
    }

    // ------------------------------------------------------------
    // Application des valeurs finales
    // ------------------------------------------------------------

    // PV / PM / RDC
    await this.update({
      "system.health.max": basePV + bonusPV,
      "system.power.max": basePM + bonusPM,
      "system.lastchance.max": baseRDC + bonusRDC
    });

    // Bagage
    await this.update({
      "system.bagage.max": baseBagage + bonusBagage
    });

    // CapSecs
    const capsecs = this.items.filter(i => i.type === "capsec");

    const getCap = (label) =>
      capsecs.find(c => c.name === game.i18n.localize(label));

    const updateCap = async (key, value) => {
      const cap = getCap(key);
      if (cap) await cap.update({ "system.capsecLevel": value });
    };
    await updateCap("LORE_LEGACY.CapSec.ResPhys", baseResPhys + bonusResPhys);
    await updateCap("LORE_LEGACY.CapSec.ResMag",  baseResMag  + bonusResMag);
    await updateCap("LORE_LEGACY.CapSec.ResMent", baseResMent + bonusResMent);
    await updateCap("LORE_LEGACY.CapSec.SeuilBlessure", baseSB + bonusSB);
    await updateCap("LORE_LEGACY.CapSec.Rapidite", baseRap + bonusRap);
  }

}
