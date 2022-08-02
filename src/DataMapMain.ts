import { NOPNotifications } from "./types.ts";

import FactBaseElement from "./FactBaseElement.ts";

export default class DataMapMain {
  static #fbes: { [key: string]: FactBaseElement } = {};
  static #ruleDependencies: { [key: string]: Set<string> } = {};
  static #actionToRuleNofitications: NOPNotifications = {};
  static #conditionsIndexToRulesNofitications: NOPNotifications = {};
  static #premisesToConditionsNofitications: NOPNotifications = {};
  static #conditionsToConditionsNofitications: NOPNotifications = {};
  static #attributesToConditionsNotifications: NOPNotifications = {};
  static #attributesToPremisesNotifications: NOPNotifications = {};
  static get fbes() {
    return this.#fbes;
  }
  static get ruleDependencies() {
    return this.#ruleDependencies;
  }
  static get actionToRuleNofitications() {
    return this.#actionToRuleNofitications;
  }
  static get conditionsIndexToRulesNofitications() {
    return this.#conditionsIndexToRulesNofitications;
  }
  static get premisesToConditionsNofitications() {
    return this.#premisesToConditionsNofitications;
  }
  static get conditionsToConditionsNofitications() {
    return this.#conditionsToConditionsNofitications;
  }
  static get attributesToConditionsNotifications() {
    return this.#attributesToConditionsNotifications;
  }
  static get attributesToPremisesNotifications() {
    return this.#attributesToPremisesNotifications;
  }
  static addFBE(fbe: FactBaseElement): FactBaseElement | void {
    if (DataMapMain.fbes[fbe.name]) {
      return DataMapMain.fbes[fbe.name];
    }
    if (!fbe.name) {
      throw new Error(
        `FactBaseElement: name "${fbe.name}" is invalid.`,
      );
    }
    DataMapMain.fbes[fbe.name] = fbe;
  }
  static addNotification(
    notificationsMap: NOPNotifications,
    from: any,
    to: any,
    value: any,
  ) {
    if (!notificationsMap[to]) {
      notificationsMap[to] = {};
    }
    notificationsMap[to][from] = value;
  }
  static clearNotifications(
    notificationsMap: NOPNotifications[],
    key: any,
  ): void {
    for (const n of notificationsMap) {
      delete n[key];
    }
  }
  static ruleIsSatisfiedRuleDependencies(rule: string): boolean {
    if (!DataMapMain.ruleDependencies[rule]) {
      return false;
    }
    if (DataMapMain.ruleDependencies[rule].size > 0) {
      if (!DataMapMain.actionToRuleNofitications[rule]) {
        return false;
      }
    }
    for (const d of DataMapMain.ruleDependencies[rule]) {
      if (!(d in DataMapMain.actionToRuleNofitications[rule])) {
        return false;
      }
    }
    return true;
  }
}
