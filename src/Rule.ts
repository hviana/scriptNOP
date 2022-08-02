/*
Created by: Henrique Emanoel Viana
Github: https://github.com/hviana
Page: https://sites.google.com/site/henriqueemanoelviana
cel: +55 (41) 99999-4664
*/
import FactBaseElement from "./FactBaseElement.ts";
import delay from "./libs/delay.ts";
import {
  App,
  defaultRuleOptions,
  FBEsFunc,
  NOPNotification,
  RuleOptions,
} from "./types.ts";

import ConditionTranspiler from "./ConditionTanspiler.ts";
import DataMapChild from "./DataMapChild.ts";

export default class Rule {
  static coreLoaded: boolean = false;
  static initialized: boolean = false;
  #conditionTranspiler: ConditionTranspiler;
  #triggers: Set<string> = new Set();
  #options: RuleOptions;
  /**
   * @param {name} string, Rule name, must be unique for each instance.
   * @param {condition} Condition, Rule condition.
   * @param {action} (context: { [key: string]: InRuleFactBaseElement }, notifications: Notifications) => Promise<any> | any, Function that will be executed if the Rule is satisfied.
   * @param {delay} number, delay that a Rule waits before executing its action, in milliseconds.
   * @param {depends} string[], names of the other Rules that are its dependencies. A Rule is only executed if it receives notifications from all of its dependencies. When a Rule is satisfied, the current current incoming notifications are deleted.
   */
  constructor(
    options: RuleOptions,
  ) {
    if (!Rule.coreLoaded) {
      App.init({ numThreads: 0 });
      Rule.coreLoaded = true;
    }
    this.#options = { ...defaultRuleOptions, ...options };
    DataMapChild.addRule(this);
    this.#options.depends = [ //remove duplications
      ...new Set(this.#options.depends),
    ];
    for (const d of this.#options.depends) {
      if (!DataMapChild.rules[d]) {
        throw new Error(
          `Declare a rule with name "${d}" before using it as a dependency.`,
        );
      }
      DataMapChild.rules[d].triggers.add(this.#options.name);
    }
    this.#conditionTranspiler = new ConditionTranspiler(this.#options.name);
    App.handler.sendToMainThread({
      type: "register-rule-dependencies",
      payload: {
        rule: this.name,
        depends: new Set(this.#options.depends),
      },
    });
    if (Rule.initialized) {
      this.initialize();
    }
  }
  initialize() {
    this.#conditionTranspiler.transpile(this.#options.condition);
  }

  get name() {
    return this.#options.name;
  }
  get options() {
    return this.#options;
  }
  get triggers() {
    return this.#triggers;
  }
  /**
   * checks if a Rule is satisfied and performs its action. It should only be called by rules that already satisfy its dependencies.
   * @param {fbes} string[], Array with the names of the FBEs.
   */
  async notifyAction(): Promise<void> {
    try {
      await delay(this.#options.delay!); //don't need a Dispatcher, use async with delay.
      const rule = this;
      const fbes: FBEsFunc = (name: string): FactBaseElement => {
        return new FactBaseElement(
          name,
          {},
          rule.name,
        );
      };
      const notificationValue = await this.#options.action(
        fbes,
      );
      const notifications: NOPNotification[] = [];
      for (const to of this.#triggers) {
        notifications.push(
          {
            from: this.name,
            to: to,
            from_type: "Action",
            to_type: "Rule",
            value: notificationValue,
          },
        );
      }
      App.notify(
        notifications,
        "main",
      );
    } catch (e) {
      console.log(e);
    }
  }
}
