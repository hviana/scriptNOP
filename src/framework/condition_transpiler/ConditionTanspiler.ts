/*
Created by: Henrique Emanoel Viana
Github: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/

import {
  Attribute,
  Condition,
  ConditionAsPremise,
  ConditionWithAnd,
  ConditionWithAttribute,
  ConditionWithConstant,
  ConditionWithFunc,
  ConditionWithNot,
  ConditionWithOr,
  ConditionWithRef,
  ConditionWithXor,
  MapEntry,
  NOPNotification,
  NOPNotifications,
  NotificationMode,
} from "../ts/types.ts";
import { App } from "../ts/constants.ts";

import ConcatenatedErrorSilenced from "../utils/ConcatenatedErrorSilenced.ts";

import IndexedAttribute from "../indexed_elements/IndexedAttribute.ts";
import IndexedCondition from "../indexed_elements/IndexedCondition.ts";
import IndexedConstant from "../indexed_elements/IndexedConstant.ts";

import ConditionParametersTanspiler from "./ConditionParametersTanspiler.ts";

import DataMapChild from "../thread_mem/DataMapChild.ts";
export default class ConditionTranspiler {
  #ruleName: string = "";
  constructor(ruleName: string) {
    this.#ruleName = ruleName;
  }
  #transpileConstant(constant: any): string {
    const exists: MapEntry = IndexedConstant.add(constant);
    return `IndexedConstant.transpiledValues[${exists}]`;
  }
  #transpileAttribute(
    fbeVal: Attribute,
    attributeIndexes: MapEntry[],
  ): string {
    const exists: MapEntry = IndexedAttribute.add(fbeVal);
    DataMapChild.addToMap(
      "attrFbeIndexMap",
      [fbeVal.attr, fbeVal.fbe, exists],
    );
    attributeIndexes.push(exists);
    return `attrNotifications[${exists}]`;
  }
  #transpileReference(
    c: Condition,
    conditionsIndexes: MapEntry[],
  ): string {
    const refIndex = DataMapChild.getMapEntries("ruleConditionIndexMap", [
      (c as ConditionWithRef).ref,
    ])[0];
    if (refIndex === undefined) {
      throw new Error(
        `Condition transpiling error: ${JSON.stringify(c)}. Rule named "${
          (c as ConditionWithRef).ref
        }" was not declared before being referenced or does not have Conditions.`,
      );
    }
    conditionsIndexes.push(refIndex);
    return `conditionsNotifications[${refIndex}]`;
  }
  transpile(
    c: Condition,
    subCondition: boolean = false,
    conditionsIndexes: MapEntry[] = [],
  ): undefined | string {
    if (!c && subCondition) {
      return "";
    }
    const attributeIndexes: MapEntry[] = [];
    const subConditionsIndexes: MapEntry[] = [];
    var str = "";
    if ("not" in (c as ConditionWithNot)) {
      str += "!("; //open parentheses
      c = (c as ConditionWithNot).not;
    } else {
      str += "("; //open parentheses
    }
    if ("attribute" in (c as ConditionWithAttribute)) {
      str += this.#transpileAttribute(
        (c as ConditionWithAttribute).attribute,
        attributeIndexes,
      );
    } else if ("is" in (c as ConditionAsPremise)) {
      str += `${
        this.transpile(
          (c as ConditionAsPremise).left,
          true,
          subConditionsIndexes,
        )
      } ${(c as ConditionAsPremise).is} ${
        this.transpile(
          (c as ConditionAsPremise).right,
          true,
          subConditionsIndexes,
        )
      }`;
    } else if ("constant" in (c as ConditionWithConstant)) {
      str += this.#transpileConstant((c as ConditionWithConstant).constant);
    } else if ("ref" in (c as ConditionWithRef)) {
      str += this.#transpileReference(c, subConditionsIndexes);
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
      } else if ("op" in (c as ConditionWithFunc)) {
        subConditions = (c as ConditionWithFunc).sub_conditions;
        op = (c as ConditionWithFunc).op;
      }
      if (op) {
        if (
          ((c as ConditionWithFunc).op as string) in
            DataMapChild.extensions
        ) {
          str += `await DataMapChild.extensions['${
            (c as ConditionWithFunc).op
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
    str += ")"; //close parentheses
    str = ConditionParametersTanspiler.transpile(
      c,
      str,
      subConditionsIndexes,
      this,
    );
    const exists: MapEntry = IndexedCondition.add(c, str);
    for (const attributeIndex of attributeIndexes) {
      DataMapChild.addToMap(
        "attrFbeIndexConditionsIndexMap",
        [attributeIndex, exists],
      );
      DataMapChild.addToMap(
        "conditionsIndexAttrFbeIndexMap",
        [exists, attributeIndex],
      );
    }
    for (const subConditionsIndex of subConditionsIndexes) {
      DataMapChild.addToMap(
        "conditionIndexConditionsIndexMap",
        [subConditionsIndex, exists],
      );
      DataMapChild.addToMap(
        "conditionIndexConditionsIndexMapInverse",
        [exists, subConditionsIndex],
      );
    }
    if (
      !((subConditionsIndexes.length === 0) &&
        (attributeIndexes.length === 0))
    ) { //condition is notificable
      conditionsIndexes.push(exists);
    }
    if (subCondition) { //is subcondition
      if (
        (subConditionsIndexes.length === 0) &&
        (attributeIndexes.length === 0)
      ) { //condition is not notificable
        return str;
      } else {
        return `conditionsNotifications[${exists}]`;
      }
    }
    //is main condition
    if (
      (subConditionsIndexes.length === 0) &&
      (attributeIndexes.length === 0)
    ) {
      throw new Error(
        `A Condition must have in its tree at least one notifying entity (and not just constants).`,
      );
    }
    DataMapChild.addToMap(
      "conditionIndexRuleMap",
      [exists, this.#ruleName],
    );
    DataMapChild.addToMap(
      "ruleConditionIndexMap",
      [this.#ruleName, exists],
    );
  }
  static receiveFBEtoAttrNotification(
    fbe: string,
    attr: string,
    value: any,
    mode: NotificationMode,
  ): void {
    const attrFbeIndex = DataMapChild.getMapEntries(
      "attrFbeIndexMap",
      [attr, fbe],
    )[0];
    if (attrFbeIndex) {
      const conditionsIndexes = DataMapChild.getMapEntries(
        "attrFbeIndexConditionsIndexMap",
        [attrFbeIndex],
      );
      const notifications: NOPNotification[] = [];
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
            condition: IndexedCondition.allConditions[cIndex as number],
            index: cIndex,
          },
          from_type: "Attribute",
          to_type: "Condition",
          value: value,
          mode: mode,
        });
      }
      App.notify(
        notifications,
        "main",
      );
    }
  }

  static async receiveToConditionNotification(
    conditionIndex: MapEntry,
    attrNotifications: NOPNotifications,
    conditionsNotifications: NOPNotifications,
    mode: NotificationMode,
  ) {
    //closed-world assumption: notifications that do not exist are referenced by the value unidefined
    var value = null;
    try {
      value = await IndexedCondition.allConditionsCompiled
        [conditionIndex as number](
          attrNotifications,
          conditionsNotifications,
        );
    } catch (e) {
      new ConcatenatedErrorSilenced(
        e,
        `Error in evaluating Condition ${conditionIndex}, Condtition: ${
          JSON.stringify(
            IndexedCondition.allConditions[conditionIndex as number],
          )
        }, procedure: ${
          IndexedCondition.allConditionsCompiled[conditionIndex as number]
            .toString()
        }, notifications: ${
          JSON.stringify({
            attrNotifications: attrNotifications,
            conditionsNotifications: conditionsNotifications,
          })
        }.`,
        true,
      );
    }
    const parentConditionsIndexes = DataMapChild.getMapEntries(
      "conditionIndexConditionsIndexMap",
      [conditionIndex],
    );
    const cNotifications: NOPNotification[] = [];
    for (const cIndex of parentConditionsIndexes) {
      cNotifications.push(
        {
          from: {
            condition: IndexedCondition.allConditions[conditionIndex as number],
            index: conditionIndex,
          },
          to: {
            condition: IndexedCondition.allConditions[cIndex as number],
            index: cIndex,
          },
          from_type: "Condition",
          to_type: "Condition",
          value: value,
          mode: mode,
        },
      );
    }
    const conditionRules = DataMapChild.getMapEntries(
      "conditionIndexRuleMap",
      [conditionIndex],
    );
    for (const rule of conditionRules) {
      cNotifications.push(
        {
          from: {
            condition: IndexedCondition.allConditions[conditionIndex as number],
            index: conditionIndex,
          },
          to: rule,
          from_type: "Condition",
          to_type: "Rule",
          value: value,
          mode: mode,
        },
      );
    }
    App.notify(cNotifications, "main");
  }
}
