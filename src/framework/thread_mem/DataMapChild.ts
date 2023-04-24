/*
Created by: Henrique Emanoel Viana
Github: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/

import Deferred from "../utils/Deferred.ts";
import { Attribute, Condition, MapEntry, MultiLevelMap } from "../ts/types.ts";

import deepEqual from "../../extensions/deepEqual.ts";

import ConcatenatedErrorSilenced from "../utils/ConcatenatedErrorSilenced.ts";

import Rule from "../Rule.ts";

export default class DataMapChild {
  static indexMap: { [key: string]: MultiLevelMap } = {};
  static extensions: {
    [key: string]: Function;
  } = {};
  static rules: { [key: string]: Rule } = {};
  static attrActionNotifications: {
    [key: string]: { [key: string]: Deferred };
  } = {};
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
        `Rule: name "${rule.options.name}" already exists or is invalid.`,
      );
    }
    DataMapChild.rules[rule.options.name] = rule;
  }
  static addToMap(map: string, entries: MapEntry[]): void {
    if (!DataMapChild.indexMap[map]) {
      DataMapChild.indexMap[map] = {};
    }
    var ref: any = DataMapChild.indexMap[map];
    for (const e of entries) {
      if (!ref[e]) {
        ref[e] = {};
      }
      ref = ref[e];
    }
  }
  static getMapEntries(map: string, entries: MapEntry[]): MapEntry[] {
    var ref: any = DataMapChild.indexMap[map];
    if (!ref) {
      return [];
    }
    for (const e of entries) {
      if (ref[e]) {
        ref = ref[e];
      } else {
        return [];
      }
    }
    return Object.keys(ref);
  }

  /**
   * Registers extension procedures to be used within Conditions.
   * @param {namedFunctions} Function[], procedures to be registered. Must be named procedures, cannot be anonymous procedures.
   */
  static registerExtensions(namedFunctions: Function[]): void {
    for (const e of namedFunctions) {
      DataMapChild.extensions[e.name] = e;
    }
  }
}
