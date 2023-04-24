import { Condition, MapEntry } from "../ts/types.ts";

import ConcatenatedErrorSilenced from "../utils/ConcatenatedErrorSilenced.ts";

import deepEqual from "../../extensions/deepEqual.ts";

import IndexedConstant from "./IndexedConstant.ts";

/*
Created by: Henrique Emanoel Viana
Github: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/
export default class IndexedCondition {
  static allConditions: Condition[] = [];
  static allConditionsCompiled: Function[] = [];
  static add(c: Condition, transpiled: string): MapEntry {
    const e = IndexedCondition.#has(c);
    if (e >= 0) {
      return e;
    }
    IndexedCondition.allConditions.push(c);
    const exists = IndexedCondition.allConditions.length - 1;
    try {
      IndexedConstant.add(IndexedConstant.initialConstant); //fix eval bug
      IndexedCondition.allConditionsCompiled.push(eval(
        `async (attrNotifications, conditionsNotifications) => ${transpiled}`,
      ));
    } catch (e) {
      new ConcatenatedErrorSilenced(
        e,
        `Error in transpiling Condition, Condtition: ${
          JSON.stringify(c)
        }, transpiler string: ${transpiled}.`,
      );
    }
    return exists;
  }
  static #has(c: Condition): MapEntry {
    var exists: MapEntry = -1;
    for (const index in IndexedCondition.allConditions) {
      if (
        deepEqual([IndexedCondition.allConditions[index], c])
      ) {
        exists = index;
        break;
      }
    }
    return exists;
  }
}
