import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from "../helpers/effects.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * ItemSheet V2 – Compatible Foundry VTT 14.0
 */
export class LoreLegacyItemSheet extends HandlebarsApplicationMixin(ApplicationV2) {

  /* -------------------------------------------- */
  /*  DEFAULT OPTIONS                             */
  /* -------------------------------------------- */
  static DEFAULT_OPTIONS = {
    id: "lorelegacy-item-sheet",
    tag: "form",
    classes: ["fvtt-lore-legacy", "sheet", "item"],

    form: {
      handler: "formHandler",
      closeOnSubmit: true
    },

    position: {
      width: 520,
      height: 480
    },

    window: {
      title: "LORE_LEGACY.ItemSheet",
      icon: "fas fa-scroll",
      contentClasses: ["standard-form"]
    },

    actions: {
      "effect-control": LoreLegacyItemSheet._onEffectControl
    }
  };

  /* -------------------------------------------- */
  /*  PARTS                                       */
  /* -------------------------------------------- */
  static PARTS = {
    main: {
      template: (sheet) =>
        `systems/fvtt-lore-legacy/templates/item/item-${sheet.document.type}-sheet.hbs`
    },
    footer: {
      template: "templates/generic/form-footer.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  DOCUMENT ACCESSOR                           */
  /* -------------------------------------------- */
  get document() {
    return this.object;
  }

  /* -------------------------------------------- */
  /*  CONTEXT                                     */
  /* -------------------------------------------- */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const itemData = this.document.toObject(false);

    const enrichedDescription =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.document.system.description,
        {
          secrets: this.document.isOwner,
          async: true,
          rollData: this.document.getRollData(),
          relativeTo: this.document
        }
      );

    return {
      ...context,
      system: itemData.system,
      flags: itemData.flags,
      enrichedDescription,
      config: CONFIG.LORE_LEGACY,
      effects: prepareActiveEffectCategories(this.document.effects),
      buttons: [
        { type: "submit", icon: "fa-solid fa-save", label: "SETTINGS.Save" }
      ]
    };
  }

  /* -------------------------------------------- */
  /*  RENDER LISTENERS                            */
  /* -------------------------------------------- */
  _onRender(context, options) {
    for (const el of this.element.querySelectorAll(".effect-control")) {
      el.addEventListener("click", (ev) =>
        LoreLegacyItemSheet._onEffectControl.call(this, ev)
      );
    }
  }

  /* -------------------------------------------- */
  /*  ACTIONS                                     */
  /* -------------------------------------------- */
  static _onEffectControl(event) {
    event.preventDefault();
    onManageActiveEffect(event, this.document);
  }

  /* -------------------------------------------- */
  /*  SUBMIT HANDLER                              */
  /* -------------------------------------------- */
  async formHandler(event, form, formData) {
    const expanded = foundry.utils.expandObject(formData.object);
    await this.document.update(expanded);
  }
}
