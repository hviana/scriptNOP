/*
Created by: Henrique Emanoel Viana
Github: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/
import ActionNotifier from "./ActionNotifier.ts";
import {
  FBEsFunc,
  InferenceData,
  NOPNotification,
  RuleOptions,
} from "./ts/types.ts";

import ConcatenatedErrorSilenced from "./utils/ConcatenatedErrorSilenced.ts";

import { App, defaultRuleOptions } from "./ts/constants.ts";

import ConditionTranspiler from "./condition_transpiler/ConditionTanspiler.ts";
import DataMapChild from "./thread_mem/DataMapChild.ts";

export default class Rule {
  static coreLoaded: boolean = false;
  static initialized: boolean = false;
  #conditionTranspiler: ConditionTranspiler;
  #options: RuleOptions;
  /**
   * @param {name} string, Rule name, must be unique for each instance.
   * @param {condition} Condition, optionnal Rule condition.
   * @param {action} (fbes:FBEsFunc)=>Promise<any>|any, a procedure that will be executed if the Rule is satisfied.
   */
  constructor(
    options: RuleOptions,
  ) {
    if (!Rule.coreLoaded) {
      App.init({ numThreads: 0 });
      Rule.coreLoaded = true;
    }
    this.#options = { ...defaultRuleOptions, ...options };
    if (!this.#options.name) {
      throw new Error(
        `Rule: name "${this.#options.name}" is invalid.`,
      );
    }
    DataMapChild.addRule(this);
    this.#conditionTranspiler = new ConditionTranspiler(this.#options.name);
    if (Rule.initialized) {
      this.initialize();
    }
  }
  initialize() {
    if (this.#options.condition!) {
      this.#conditionTranspiler.transpile(this.#options.condition!);
    }
  }

  get name() {
    return this.#options.name;
  }
  get options() {
    return this.#options;
  }
  /**
   * Notifies an Action of a Rule. This notification can only be triggered if the Rule has received the proper notifications of its Condition and its dependencies through Actions.
   */
  async notifyAction(inferenceData: InferenceData): Promise<void> {
    try {
      const notifier = new ActionNotifier(this.name);
      await this.#options.action(
        notifier,
        inferenceData,
      );
    } catch (e) {
      new ConcatenatedErrorSilenced(
        e,
        `Error in executing Action, Rule Action : ${this.name}, procedure: ${this.#options.action.toString()}, inference data: ${
          JSON.stringify(inferenceData)
        }.`,
        true,
      );
    }
  }
}
