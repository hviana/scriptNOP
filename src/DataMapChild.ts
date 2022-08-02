import Deferred from "./Deferred.ts";
import {
  Attribute,
  Condition,
  MapEntry,
  MultiLevelMap,
  Premise,
} from "./types.ts";

import deepEqual from "./extensions/deepEqual.ts";

import Rule from "./Rule.ts";

export default class DataMapChild {
  static #allPremises: Premise[] = [];
  static #allPremisesStr: string[] = [];
  static #allPremisesCompiled: Function[] = [];
  static #allAttrs: [string, string][] = [];
  static #transpiledValues: any[] = [];
  static #attrFbeIndexPremisesIndexMap: MultiLevelMap = {};
  static #attrFbeIndexConditionsIndexMap: MultiLevelMap = {};
  static #attrFbeIndexMap: MultiLevelMap = {};
  static #premiseIndexConditionsIndexMap: MultiLevelMap = {};
  static #conditionIndexConditionsIndexMap: MultiLevelMap = {};
  static #conditionIndexRuleMap: MultiLevelMap = {};
  static #allConditions: Condition[] = [];
  static #allConditionsStr: string[] = [];
  static #allConditionsCompiled: Function[] = [];
  static #extensions: {
    [key: string]: Function;
  } = {};
  static #rules: { [key: string]: Rule } = {};
  static #attrActionNotifications: {
    [key: string]: { [key: string]: Deferred };
  } = {};
  static get allPremises() {
    return this.#allPremises;
  }
  static get allPremisesStr() {
    return this.#allPremisesStr;
  }
  static get allPremisesCompiled() {
    return this.#allPremisesCompiled;
  }
  static get allAttrs() {
    return this.#allAttrs;
  }
  static get transpiledValues() {
    return this.#transpiledValues;
  }
  static get attrFbeIndexPremisesIndexMap() {
    return this.#attrFbeIndexPremisesIndexMap;
  }
  static get attrFbeIndexConditionsIndexMap() {
    return this.#attrFbeIndexConditionsIndexMap;
  }
  static get attrFbeIndexMap() {
    return this.#attrFbeIndexMap;
  }
  static get premiseIndexConditionsIndexMap() {
    return this.#premiseIndexConditionsIndexMap;
  }
  static get conditionIndexConditionsIndexMap() {
    return this.#conditionIndexConditionsIndexMap;
  }
  static get conditionIndexRuleMap() {
    return this.#conditionIndexRuleMap;
  }
  static get allConditions() {
    return this.#allConditions;
  }
  static get allConditionsStr() {
    return this.#allConditionsStr;
  }
  static get allConditionsCompiled() {
    return this.#allConditionsCompiled;
  }
  static get extensions() {
    return this.#extensions;
  }
  static get rules() {
    return this.#rules;
  }
  static get attrActionNotifications() {
    return this.#attrActionNotifications;
  }
  static getAttrActionPromise(fbe: string, attr: string): Promise<any> {
    if (!DataMapChild.attrActionNotifications[fbe]) {
      DataMapChild.attrActionNotifications[fbe] = {};
    }
    if (!DataMapChild.attrActionNotifications[fbe][attr]) {
      DataMapChild.attrActionNotifications[fbe][attr] = new Deferred();
    }
    return DataMapChild.attrActionNotifications[fbe][attr].promise;
  }
  static resolveAttrActionPromise(fbe: string, attr: string, value: any): void {
    if (DataMapChild.attrActionNotifications[fbe]) {
      if (DataMapChild.attrActionNotifications[fbe][attr]) {
        DataMapChild.attrActionNotifications[fbe][attr].resolve(value);
        delete DataMapChild.attrActionNotifications[fbe][attr];
      }
    }
  }
  static addRule(rule: Rule) {
    if (DataMapChild.rules[rule.options.name] || !rule.options.name) {
      throw new Error(
        `Rule: name "${rule.options.name}" is invalid.`,
      );
    }
    DataMapChild.rules[rule.options.name] = rule;
  }
  static hasArrValue(arr: any[], value: any): MapEntry {
    var exists: MapEntry = 0;
    for (const index in DataMapChild.allPremisesStr) {
      if (arr[index] === value) {
        exists = index;
        break;
      }
    }
    return exists;
  }
  static addToMap(map: MultiLevelMap, entries: MapEntry[]): void {
    var ref: any = map;
    for (const e of entries) {
      if (!ref[e]) {
        ref[e] = {};
      }
      ref = ref[e];
    }
  }
  static getMapEntries(map: MultiLevelMap, entries: MapEntry[]): MapEntry[] {
    var ref: any = map;
    for (const e of entries) {
      if (ref[e]) {
        ref = ref[e];
      } else {
        return [];
      }
    }
    return Object.keys(ref);
  }
  static hasValue(value: any): MapEntry {
    var exists: MapEntry = 0;
    for (const index in DataMapChild.transpiledValues) {
      if (
        deepEqual([DataMapChild.transpiledValues[index], value])
      ) {
        exists = index;
        break;
      }
    }
    return exists;
  }
  static addValue(value: any): MapEntry {
    DataMapChild.transpiledValues.push(value);
    return DataMapChild.transpiledValues.length - 1;
  }
  static addPremise(p: Premise, str: string): MapEntry {
    DataMapChild.allPremises.push(p);
    const exists = DataMapChild.allPremises.length - 1;
    DataMapChild.allPremisesStr.push(str);
    DataMapChild.allPremisesCompiled.push(
      eval(`async (attrNotifications) => ${str}`),
    );
    return exists;
  }
  static hasAttribute(fbeVal: Attribute): MapEntry {
    var exists: MapEntry = 0;
    for (const index in DataMapChild.allAttrs) {
      if (
        (DataMapChild.allAttrs[index][0] === fbeVal.fbe) &&
        (DataMapChild.allAttrs[index][1] === fbeVal.attr)
      ) {
        exists = index;
        break;
      }
    }
    return exists;
  }
  static addAttribute(fbeVal: Attribute): MapEntry {
    DataMapChild.allAttrs.push([fbeVal.fbe, fbeVal.attr]);
    return DataMapChild.allAttrs.length - 1;
  }
  static addCondition(c: Condition, str: string): MapEntry {
    DataMapChild.allConditions.push(c);
    const exists = DataMapChild.allConditions.length - 1;
    DataMapChild.allConditionsStr.push(str);
    DataMapChild.allConditionsCompiled.push(eval(
      `async (attrNotifications, premisesNotifications, conditionsNotifications) => ${str}`,
    ));
    return exists;
  }

  /**
   * Registers extension functions to be used within Conditions.
   * @param {namedFunctions} Function[], functions to be registered. Must be named functions, cannot be anonymous functions.
   */
  static registerExtensions(namedFunctions: Function[]): void {
    for (const e of namedFunctions) {
      DataMapChild.extensions[e.name] = e;
    }
  }
}
