/*
Created by: Henrique Emanoel Viana
Github: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/
import { MapEntry } from "../ts/types.ts";

import deepEqual from "../../extensions/deepEqual.ts";

export default class IndexedConstant {
  static initialConstant: number = 0; //fix eval bug
  static transpiledValues: any[] = [IndexedConstant.initialConstant];
  static #has(value: any): MapEntry {
    var exists: MapEntry = -1;
    for (const index in IndexedConstant.transpiledValues) {
      if (
        deepEqual([IndexedConstant.transpiledValues[index], value])
      ) {
        exists = index;
        break;
      }
    }
    return exists;
  }
  static add(value: any): MapEntry {
    const e = IndexedConstant.#has(value);
    if (e >= 0) {
      return e;
    }
    IndexedConstant.transpiledValues.push(value);
    return IndexedConstant.transpiledValues.length - 1;
  }
}
