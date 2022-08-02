/*
Created by: Henrique Emanoel Viana
Github: https://github.com/hviana
Page: https://sites.google.com/site/henriqueemanoelviana
cel: +55 (41) 99999-4664
*/

import MessageHandler from "./MessageHandler.ts";
import Rule from "./Rule.ts";

import FactBaseElement from "./FactBaseElement.ts";

import { AppOptions, defaultAppOptions, NOPNotification } from "./types.ts";

import DataMapMain from "./DataMapMain.ts";
import DataMapChild from "./DataMapChild.ts";

import ConditionTranspiler from "./ConditionTanspiler.ts";

export default class AppNOP {
  #options: AppOptions = defaultAppOptions;
  #workers: Worker[] = [];
  #handler: MessageHandler = new MessageHandler([], {});
  #preLoadedNotifications: NOPNotification[] = [];
  /**
   * Initializes the application. It must be called at the beginning of the state-manager thread (main thread).
   * @param {numThreads} number, number of threads that will execute Rules.
   * @param {permissions} any, see Deno worker permissions for more details. The default value is "inherit".
   * @param {extensionsURLs} string[], urls of the extension functions used in the Conditions of Rules. Url definition examples: new URL("./src/extensions/deepEqual.ts", import.meta.url).href, "https://deno.land/x/script_nop@v1.4.1/src/extensions/deepEqual.ts".
   * @param {rulesURL} string, a url string in the above definition pattern. it can point to a file that contains all the Rules or that imports all the files where the Rules are.
   * @param {maxHistorySize} number, maximum size of Rule activation history with respective contexts.
   * @param {onRuleNotification} (rule: string, msg: any) => void | Promise<void>, a function that allows the main thread (state manager) to capture each output Notification from the Actions of the Rules executed.
   */
  init(options: AppOptions): void {
    this.#options = { ...this.options, ...options };
    for (let i = 0; i < this.options.numThreads!; i++) {
      this.#workers.push(
        new Worker(
          this.options.rulesURL!,
          {
            type: "module",
            // @ts-ignore
            deno: {
              namespace: true,
              permissions: this.options.permissions,
            },
          },
        ),
      );
    }
    this.#handler = new MessageHandler(this.#workers, {
      "register-rule-dependencies": async (
        msg: any,
        from: Worker | undefined,
      ) => { //main thread receives
        DataMapMain.ruleDependencies[msg.rule] = msg.depends;
        DataMapMain.actionToRuleNofitications[msg.rule] = {};
      },
      "notify": async (msg: any, from: Worker | undefined) => { //main or child thread receives
        if (this.handler.isMainThread) { //if main thread receives
          this.onNotifications(msg);
        }
        for (const n of msg) {
          this.handleNotification(n, from); //without await.
        }
      },
      "apply-notification": async (msg: any, from: Worker | undefined) => { //child thread receives
        if (msg.subtype === "attr-premise") {
          await ConditionTranspiler.receiveAttrToPremiseNotification(
            msg.to,
            msg.attributesToPremisesNotifications,
          );
        } else if (msg.subtype === "attr-premise-condition") {
          await ConditionTranspiler.receiveToConditionNotification(
            msg.to,
            msg.attributesToConditionsNotifications,
            msg.premisesToConditionsNofitications,
            msg.conditionsToConditionsNofitications,
          );
        }
      },
    }, { //send to childs threads (init step 1)
      type: "",
      payload: {
        extensionsURLs: this.options.extensionsURLs,
      },
    }, async (main: Worker, msg) => { //child thread receives (init step 2)
      for (const exUrl of msg.extensionsURLs) {
        const exLib = await import(exUrl);
        DataMapChild.registerExtensions([exLib.default]);
      }
      Rule.initialized = true;
      for (const r in DataMapChild.rules) {
        DataMapChild.rules[r].initialize();
      }
    }, async (child: Worker, msg) => { //main thread receives (init step 3)
      if (this.#preLoadedNotifications.length > 0) {
        this.notify(this.#preLoadedNotifications, child);
        this.#preLoadedNotifications = [];
      }
    });
    this.handler.initialize(); //starts threads initializations
  }
  get handler() {
    return this.#handler;
  }
  get options() {
    return this.#options;
  }

  notify(notifications: NOPNotification[], target: "main" | "child" | Worker) {
    if (notifications.length === 0) {
      return;
    }
    if (target === "child" && this.handler.noThreadsLoaded) {
      this.#preLoadedNotifications.push(...notifications);
      return;
    }
    this.onNotifications(notifications);
    if (target === "child") {
      this.handler.sendToRandomChildThread(
        {
          type: "notify",
          payload: notifications,
        },
      );
    } else if (target === "main") {
      this.handler.sendToMainThread(
        {
          type: "notify",
          payload: notifications,
        },
      );
    } else {
      this.handler.sendToChildThread(target, {
        type: "notify",
        payload: notifications,
      });
    }
  }
  async handleNotification(n: NOPNotification, from: Worker | undefined) { //child thread receives
    if (n.from_type === "Fact Base Element" && n.to_type === "Attribute") {
      await ConditionTranspiler.receiveFBEtoAttrNotification(
        n.from,
        n.to,
        n.value,
      );
    } else if (n.from_type === "Attribute" && n.to_type === "Premise") { //main thread receives
      DataMapMain.addNotification(
        DataMapMain.attributesToPremisesNotifications,
        n.from.index,
        n.to.index,
        n.value,
      );
      this.handler.sendToRandomChildThread(
        {
          type: "apply-notification",
          payload: {
            subtype: "attr-premise",
            to: n.to.index,
            attributesToPremisesNotifications:
              DataMapMain.attributesToPremisesNotifications[n.to.index] || {},
          },
        },
      );
    } else if (n.from_type === "Attribute" && n.to_type === "Condition") { //main thread receives
      DataMapMain.addNotification(
        DataMapMain.attributesToConditionsNotifications,
        n.from.index,
        n.to.index,
        n.value,
      );
      this.handler.sendToRandomChildThread(
        {
          type: "apply-notification",
          payload: {
            subtype: "attr-premise-condition",
            to: n.to.index,
            attributesToConditionsNotifications:
              DataMapMain.attributesToConditionsNotifications[n.to.index] || {},
            premisesToConditionsNofitications:
              DataMapMain.premisesToConditionsNofitications[n.to.index] || {},
            conditionsToConditionsNofitications:
              DataMapMain.conditionsToConditionsNofitications[n.to.index] || {},
          },
        },
      );
    } else if (n.from_type === "Premise" && n.to_type === "Condition") { //main thread receives
      DataMapMain.addNotification(
        DataMapMain.premisesToConditionsNofitications,
        n.from.index,
        n.to.index,
        n.value,
      );
      this.handler.sendToRandomChildThread(
        {
          type: "apply-notification",
          payload: {
            subtype: "attr-premise-condition",
            to: n.to.index,
            attributesToConditionsNotifications:
              DataMapMain.attributesToConditionsNotifications[n.to.index] || {},
            premisesToConditionsNofitications:
              DataMapMain.premisesToConditionsNofitications[n.to.index] || {},
            conditionsToConditionsNofitications:
              DataMapMain.conditionsToConditionsNofitications[n.to.index] || {},
          },
        },
      );
    } else if (n.from_type === "Condition" && n.to_type === "Condition") { //main thread receives
      DataMapMain.addNotification(
        DataMapMain.conditionsToConditionsNofitications,
        n.from.index,
        n.to.index,
        n.value,
      );
      this.handler.sendToRandomChildThread(
        {
          type: "apply-notification",
          payload: {
            subtype: "attr-premise-condition",
            to: n.to.index,
            attributesToConditionsNotifications:
              DataMapMain.attributesToConditionsNotifications[n.to.index] || {},
            premisesToConditionsNofitications:
              DataMapMain.premisesToConditionsNofitications[n.to.index] || {},
            conditionsToConditionsNofitications:
              DataMapMain.conditionsToConditionsNofitications[n.to.index] || {},
          },
        },
      );
    } else if (n.from_type === "Condition" && n.to_type === "Rule") { //main thread receives
      DataMapMain.addNotification(
        DataMapMain.conditionsIndexToRulesNofitications,
        n.from.index,
        n.to,
        n.value,
      );
      this.#verifyRuleStateAndNotifyItsAction(n.to);
    } else if (n.from_type === "Rule" && n.to_type === "Action") { //child thread receives
      if (!DataMapChild.rules[n.to]) {
        return;
      }
      DataMapChild.rules[n.to].notifyAction();
    } else if (n.from_type === "Action" && n.to_type === "Fact Base Element") { //main thread receives
      if (!DataMapMain.fbes[n.to]) {
        new FactBaseElement(n.to);
      }
      DataMapMain.fbes[n.to].notify(
        n.value.path,
        n.value.input,
        n.value.mode,
      );
    } else if (n.from_type === "Action" && n.to_type === "Rule") { //main thread receives
      DataMapMain.addNotification(
        DataMapMain.actionToRuleNofitications,
        n.from,
        n.to,
        n.value,
      );
      this.#verifyRuleStateAndNotifyItsAction(n.to);
    } else if (n.from_type === "Action" && n.to_type === "Attribute") { //main thread receives
      if (!DataMapMain.fbes[n.to]) {
        new FactBaseElement(n.to);
      }
      const value = await DataMapMain.fbes[n.to.fbe].get(
        n.to.attr,
      );
      this.notify([{
        from: {
          fbe: n.to.fbe,
          attr: n.to.attr,
        },
        to: n.from,
        from_type: "Attribute",
        to_type: "Action",
        value: value,
      }], from as Worker);
    } else if (n.from_type === "Attribute" && n.to_type === "Action") { //main thread receives
      DataMapChild.resolveAttrActionPromise(n.from.fbe, n.from.attr, n.value);
    }
  }
  onNotifications(entries: NOPNotification[]) {
    if (this.options.onNotification!) {
      const time = Date.now();
      for (const e of entries) {
        e.time = time;
        this.options.onNotification!(e); //without await.
      }
    }
  }
  #verifyRuleStateAndNotifyItsAction(rule: string) {
    if (
      DataMapMain.ruleIsSatisfiedRuleDependencies(rule) &&
      (DataMapMain.conditionsIndexToRulesNofitications[rule]) //Condition must notify a js 'true' value for a Rule to activate it. Values ​​like '', null, 0 and undefined will be 'false'.
    ) {
      DataMapMain.clearNotifications([
        DataMapMain.actionToRuleNofitications,
        DataMapMain.conditionsIndexToRulesNofitications,
      ], rule);
      this.notify([
        {
          from: rule,
          to: rule,
          from_type: "Rule",
          to_type: "Action",
          value: null,
        },
      ], "child");
    }
  }
}
