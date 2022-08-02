import {
  Attribute,
  Condition,
  ConditionWithAnd,
  ConditionWithFunc,
  ConditionWithNot,
  ConditionWithOr,
  ConditionWithPremise,
  ConditionWithXor,
  MapEntry,
  NOPNotification,
  NOPNotifications,
  Premise,
} from "./types.ts";
import { App } from "./types.ts";

import DataMapChild from "./DataMapChild.ts";
export default class ConditionTranspiler {
  #ruleName: string = "";
  constructor(ruleName: string) {
    this.#ruleName = ruleName;
  }
  #inRuntimeIsAttribute(anything: any): boolean {
    return (typeof anything === "object" && "fbe" in anything &&
      "attr" in anything);
  }
  #transpileAttribute(
    fbeVal: Attribute,
    attributeIndexes: MapEntry[] = [],
  ): string {
    var exists = DataMapChild.hasAttribute(fbeVal);
    if (!exists) {
      //The transpiler cannot be run concurrently with other transpilers!
      exists = DataMapChild.addAttribute(fbeVal);
    }
    DataMapChild.addToMap(
      DataMapChild.attrFbeIndexMap,
      [fbeVal.attr, fbeVal.fbe, exists],
    );
    attributeIndexes.push(exists);
    return `attrNotifications[${exists}]`;
  }
  #transpilePremise(p: Premise, premiseIndexes: MapEntry[] = []): string {
    var str = "";
    const attributeIndexes: MapEntry[] = [];
    const fbeRef = this.#transpileAttribute(p, attributeIndexes);
    if (
      (p.is as string) in DataMapChild.extensions
    ) {
      str += `await DataMapChild.extensions['${p.is}']([${fbeRef}`;
      if ("value" in p) {
        str += ",";
      }
    } else {
      str += fbeRef;
      if ("is" in p) {
        str += ` ${p.is} `;
      }
    }
    if ("value" in p) {
      if (
        this.#inRuntimeIsAttribute(p.value)
      ) {
        str += this.#transpileAttribute(p.value, attributeIndexes);
      } else {
        var exists = DataMapChild.hasValue(p.value);
        if (!exists) {
          //The transpiler cannot be run concurrently with other transpilers!
          exists = DataMapChild.addValue(p.value);
        }
        str += `DataMapChild.transpiledValues[${exists}]`;
      }
    }
    if ((p.is as string) in DataMapChild.extensions) {
      str += "])";
    }
    var exists: MapEntry = DataMapChild.hasArrValue(
      DataMapChild.allPremisesStr,
      str,
    );
    if (!exists) {
      //The transpiler cannot be run concurrently with other transpilers!
      exists = DataMapChild.addPremise(p, str);
    }
    for (const attributeIndex of attributeIndexes) {
      DataMapChild.addToMap(
        DataMapChild.attrFbeIndexPremisesIndexMap,
        [attributeIndex, exists],
      );
    }
    premiseIndexes.push(exists);
    return `premisesNotifications[${exists}]`;
  }
  #transpileConditionParameters(
    c: Condition,
    str: string,
    attributeIndexes: MapEntry[] = [],
  ): string {
    if (
      "min_threshold" in c ||
      "max_threshold" in c
    ) {
      const min = this.#inRuntimeIsAttribute(c.min_threshold)
        ? this.#transpileAttribute(
          c.min_threshold as Attribute,
          attributeIndexes,
        )
        : c.min_threshold;
      const max = this.#inRuntimeIsAttribute(c.max_threshold)
        ? this.#transpileAttribute(
          c.max_threshold as Attribute,
          attributeIndexes,
        )
        : c.max_threshold;
      str = `(${"min_threshold" in c ? `${str} > ${min}` : ""} ${
        "max_threshold" in c
          ? `${"min_threshold" in c ? "&&" : ""} ${str} < ${max}`
          : ""
      })`;
    } else if ("exactly" in c) {
      const exactly = this.#inRuntimeIsAttribute(c.exactly)
        ? this.#transpileAttribute(c.exactly as Attribute, attributeIndexes)
        : c.exactly;
      str = `(${str} === ${exactly})`;
    }
    return str;
  }
  transpile(
    c: Condition,
    toString: boolean = false,
    conditionsIndexes: MapEntry[] = [],
  ): (() => Promise<boolean>) | string {
    const attributeIndexes: MapEntry[] = [];
    const premiseIndexes: MapEntry[] = [];
    const subConditionsIndexes: MapEntry[] = [];

    var str = "";
    if ("not" in (c as ConditionWithNot)) {
      str += "!(";
      c = (c as ConditionWithNot).not;
    } else {
      str += "(";
    }
    if ("premise" in (c as ConditionWithPremise)) {
      str += this.#transpilePremise(
        (c as ConditionWithPremise).premise,
        premiseIndexes,
      );
    } else {
      var op = "";
      var subConditions: Condition[] = [];
      if ("or" in (c as ConditionWithOr)) {
        subConditions = (c as ConditionWithOr).or;
        op = "||";
      } else if ("and" in (c as ConditionWithAnd)) {
        subConditions = (c as ConditionWithAnd).and;
        op = "&&";
      } else if ("xor" in (c as ConditionWithXor)) {
        subConditions = (c as ConditionWithXor).xor;
        op = "^";
      } else if ("is" in (c as ConditionWithFunc)) {
        subConditions = (c as ConditionWithFunc).sub_conditions;
        op = (c as ConditionWithFunc).is;
      }
      if (op) {
        if (
          ((c as ConditionWithFunc).is as string) in
            DataMapChild.extensions
        ) {
          str += `await DataMapChild.extensions['${
            (c as ConditionWithFunc).is
          }']([`;
          for (const i in subConditions) {
            str += `${
              this.transpile(subConditions[i], true, subConditionsIndexes)
            }${i === (subConditions.length - 1) + "" ? "" : ","} `;
          }
          str += "])";
        } else {
          for (const i in subConditions) {
            str += `${i === "0" ? "" : op} ${
              this.transpile(subConditions[i], true, subConditionsIndexes)
            } `;
          }
        }
      }
    }
    str += ") ";
    str = this.#transpileConditionParameters(c, str, attributeIndexes);
    var exists: MapEntry = DataMapChild.hasArrValue(
      DataMapChild.allConditionsStr,
      str,
    );
    if (!exists) {
      //The transpiler cannot be run concurrently with other transpilers!
      exists = DataMapChild.addCondition(c, str);
    }
    for (const attributeIndex of attributeIndexes) {
      DataMapChild.addToMap(
        DataMapChild.attrFbeIndexConditionsIndexMap,
        [attributeIndex, exists],
      );
    }
    for (const premiseIndex of premiseIndexes) {
      DataMapChild.addToMap(
        DataMapChild.premiseIndexConditionsIndexMap,
        [premiseIndex, exists],
      );
    }
    for (const subConditionsIndex of subConditionsIndexes) {
      DataMapChild.addToMap(
        DataMapChild.conditionIndexConditionsIndexMap,
        [subConditionsIndex, exists],
      );
    }
    conditionsIndexes.push(exists);
    if (toString) { //is subcondition
      return `conditionsNotifications[${exists}]`;
    }
    //is main condition
    DataMapChild.addToMap(
      DataMapChild.conditionIndexRuleMap,
      [exists, this.#ruleName],
    );
    return DataMapChild.allConditionsCompiled[exists as number] as () =>
      Promise<
        boolean
      >;
  }
  static receiveFBEtoAttrNotification(
    fbe: string,
    attr: string,
    value: any,
  ): void {
    const attrFbeIndex = DataMapChild.getMapEntries(
      DataMapChild.attrFbeIndexMap,
      [attr, fbe],
    )[0];
    if (attrFbeIndex) {
      const premisesIndexes = DataMapChild.getMapEntries(
        DataMapChild.attrFbeIndexPremisesIndexMap,
        [attrFbeIndex],
      );
      const conditionsIndexes = DataMapChild.getMapEntries(
        DataMapChild.attrFbeIndexConditionsIndexMap,
        [attrFbeIndex],
      );
      const notifications: NOPNotification[] = [];
      for (const pIndex of premisesIndexes) {
        notifications.push({
          from: {
            attribute: {
              fbe: fbe,
              attr: attr,
            },
            index: attrFbeIndex,
          },
          to: {
            //@ts-ignore
            premise: DataMapChild.allPremises[pIndex],
            index: pIndex,
          },
          from_type: "Attribute",
          to_type: "Premise",
          value: value,
        });
      }
      for (const cIndex of conditionsIndexes) {
        notifications.push({
          from: {
            attribute: {
              fbe: fbe,
              attr: attr,
            },
            index: attrFbeIndex,
          },
          to: {
            condition: DataMapChild.allConditions[cIndex as number],
            index: cIndex,
          },
          from_type: "Attribute",
          to_type: "Condition",
          value: value,
        });
      }
      App.notify(
        notifications,
        "main",
      );
    }
  }
  static async receiveAttrToPremiseNotification(
    premiseIndex: MapEntry,
    attrNotifications: NOPNotifications,
  ) {
    const value = await DataMapChild.allPremisesCompiled
      [premiseIndex as number](
        attrNotifications,
      );
    const conditionsIndexes = DataMapChild.getMapEntries(
      DataMapChild.premiseIndexConditionsIndexMap,
      [premiseIndex],
    );
    const notifications: NOPNotification[] = [];
    for (const cIndex of conditionsIndexes) {
      notifications.push(
        {
          from: {
            premise: DataMapChild.allPremises[premiseIndex as number],
            index: premiseIndex,
          },
          to: {
            condition: DataMapChild.allConditions[cIndex as number],
            index: cIndex,
          },
          from_type: "Premise",
          to_type: "Condition",
          value: value,
        },
      );
    }
    App.notify(notifications, "main");
  }

  static async receiveToConditionNotification(
    conditionIndex: MapEntry,
    attrNotifications: NOPNotifications,
    premisesNotifications: NOPNotifications,
    conditionsNotifications: NOPNotifications,
  ) {
    const value = await DataMapChild.allConditionsCompiled
      [conditionIndex as number](
        attrNotifications,
        premisesNotifications,
        conditionsNotifications,
      );
    const parentConditionsIndexes = DataMapChild.getMapEntries(
      DataMapChild.conditionIndexConditionsIndexMap,
      [conditionIndex],
    );
    const cNotifications: NOPNotification[] = [];
    for (const cIndex of parentConditionsIndexes) {
      cNotifications.push(
        {
          from: {
            condition: DataMapChild.allConditions[conditionIndex as number],
            index: conditionIndex,
          },
          to: {
            condition: DataMapChild.allConditions[cIndex as number],
            index: cIndex,
          },
          from_type: "Condition",
          to_type: "Condition",
          value: value,
        },
      );
    }
    //Condition must notify a js 'true' value to rules. '', null, 0 and undefined will be false.
    if (value) {
      const conditionRules = DataMapChild.getMapEntries(
        DataMapChild.conditionIndexRuleMap,
        [conditionIndex],
      );
      for (const rule of conditionRules) {
        cNotifications.push(
          {
            from: {
              condition: DataMapChild.allConditions[conditionIndex as number],
              index: conditionIndex,
            },
            to: rule,
            from_type: "Condition",
            to_type: "Rule",
            value: value,
          },
        );
      }
    }
    App.notify(cNotifications, "main");
  }
}
