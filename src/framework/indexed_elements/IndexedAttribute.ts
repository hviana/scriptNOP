/*
Created by: Henrique Emanoel Viana
Github: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/
import { Attribute, MapEntry } from "../ts/types.ts";

export default class IndexedAttribute {
  static allAttrs: [string, string][] = [];
  static #has(fbeVal: Attribute): MapEntry {
    var exists: MapEntry = -1;
    for (const index in IndexedAttribute.allAttrs) {
      if (
        (IndexedAttribute.allAttrs[index][0] === fbeVal.fbe) &&
        (IndexedAttribute.allAttrs[index][1] === fbeVal.attr)
      ) {
        exists = index;
        break;
      }
    }
    return exists;
  }
  static add(fbeVal: Attribute): MapEntry {
    const e = IndexedAttribute.#has(fbeVal);
    if (e >= 0) {
      return e;
    }
    IndexedAttribute.allAttrs.push([fbeVal.fbe, fbeVal.attr]);
    return IndexedAttribute.allAttrs.length - 1;
  }
}
