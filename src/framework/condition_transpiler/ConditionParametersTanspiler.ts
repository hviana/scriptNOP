/*
Created by: Henrique Emanoel Viana
Github: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/
import { Condition, MapEntry } from "../ts/types.ts";
import ConditionTranspiler from "./ConditionTanspiler.ts";

export default class ConditionParametersTanspiler {
  static #conditionParametes: {
    [key: string]: {
      keys: string[];
      func: (
        c: Condition,
        str: string,
        conditionsIndexes: MapEntry[],
        transpiler: ConditionTranspiler,
      ) => string;
    };
  } = {
    "fuzzy_interval": {
      keys: ["min_threshold", "max_threshold"],
      func: (
        c: Condition,
        str: string,
        conditionsIndexes: MapEntry[],
        transpiler: ConditionTranspiler,
      ): string => {
        const min = transpiler.transpile(
          c.min_threshold,
          true,
          conditionsIndexes,
        );
        const max = transpiler.transpile(
          c.max_threshold,
          true,
          conditionsIndexes,
        );
        return `${"min_threshold" in c ? `${str} > ${min}` : ""} ${
          "max_threshold" in c
            ? `${"min_threshold" in c ? "&&" : ""} ${str} < ${max}`
            : ""
        }`;
      },
    },
    "exactly": {
      keys: ["exactly"],
      func: (
        c: Condition,
        str: string,
        conditionsIndexes: MapEntry[],
        transpiler: ConditionTranspiler,
      ): string => {
        const exactly = transpiler.transpile(
          c.exactly,
          true,
          conditionsIndexes,
        );
        return `${str} === ${exactly}`;
      },
    },
  };
  static transpile(
    c: Condition,
    str: string,
    conditionsIndexes: MapEntry[],
    transpiler: ConditionTranspiler,
  ): string {
    for (const k in ConditionParametersTanspiler.#conditionParametes) {
      for (const key of this.#conditionParametes[k].keys) {
        if (key in c) {
          str = `(${
            this.#conditionParametes[k].func(
              c,
              str,
              conditionsIndexes,
              transpiler,
            )
          })`;
          break;
        }
      }
    }
    return str;
  }
}
