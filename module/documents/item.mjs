/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class LoreLegacyItem extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
        /**

    const itemData = this;

    this._prepareSkillData(itemData);
    */
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
  prepareBaseData() {

    const itemData = this;

    this._prepareSkillData(itemData);


  }


  prepareTriangle(genAdversite, genFortune){
    // Lore & legacy add value of skill to d10.
    const data = this.system;

    if (data.bfortune == true) {
      data.nfortune = 1;
      data.cfortune = "checked";
    }
    else {
      if(genFortune == true) {
        data.nfortune = 1;
      }
      else {
        data.nfortune = 0;
      }
      data.cfortune = "unchecked";
    }

    if (data.badversite == true) {
      data.nadversite = 1;
      data.cadversite = "checked";
    }
    else {
      if(genAdversite == true) {
        data.nadversite = 1;
      }
      else {
        data.nadversite = 0;
      }
      data.cadversite = "unchecked";
    }
  }

  /**
   * Prepare Character type specific data
   */
  _prepareSkillData(itemData) {
    if (itemData.type !== 'skill' && itemData.type !== 'spell') return;
    const data = itemData.system;


    if (data.bfortune == true) {
      data.nfortune = 1;
      data.cfortune = "checked";
    }
    else {
      if(itemData.actor && itemData.actor.system.attributes && itemData.actor.system.attributes.bfortune == true) {
        data.nfortune = 1;
      }
      else {
        data.nfortune = 0;
      }
      data.cfortune = "unchecked";
    }

    if (data.badversite == true) {
      data.nadversite = 1;
      data.cadversite = "checked";
    }
    else {
      if(itemData.actor && itemData.actor.system.attributes && itemData.actor.system.attributes.bfortune == true) {
        data.nadversite = 1;
      }
      else {
        data.nadversite = 0;
      }
      data.cadversite = "unchecked";
    }
  }

  /**
   * Prepare a data object which defines the data schema used by dice roll commands against this Item
   * @override
   */
  getRollData() {
    // Starts off by populating the roll data with a shallow copy of `this.system`
    const rollData = { ...this.system };

    // Quit early if there's no parent actor
    if (!this.actor) return rollData;

    // If present, add the actor's roll data
    rollData.actor = this.actor.getRollData();

    return rollData;
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async roll() {
    const item = this;

    // Initialize chat data.
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    const label = `[${item.type}] ${item.name}`;

    const content = item.system.description; // JSON.stringify(item);

    // If there's no roll data, send a chat message.
    if (!this.system.formula) {
      ChatMessage.create({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
        content: content,
      });
    }
    // Otherwise, create a roll and send a chat message from it.
    else {
      // Retrieve roll data.
      const rollData = this.getRollData();
      // Invoke the roll and submit it to chat.
      var dice = "d10";
      if(item.type === "spell")
      {
        dice = "d8";
      }
      
      const formula = "{(1" + dice + "[starynight]+(" + rollData.nfortune + ")" + dice + "[inspired]-(" + rollData.nadversite + ")" + dice + "[bloodmoon]),0}kh+" + rollData.formula;

      const roll = new Roll(formula, rollData);
      // If you need to store the value first, uncomment the next line.
      // const result = await roll.evaluate();
      roll.toMessage({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
      });
      return roll;
    }
  }
}
