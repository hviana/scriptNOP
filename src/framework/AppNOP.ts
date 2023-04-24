/*
Created by: Henrique Emanoel Viana
Github: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/

import MessageHandler from "./utils/MessageHandler.ts";
import Rule from "./Rule.ts";

import FactBaseElement from "./FactBaseElement.ts";

import {
  AppOptions,
  InferenceData,
  NOPEntity,
  NOPNotification,
  ProgramState,
} from "./ts/types.ts";

import { defaultAppOptions } from "./ts/constants.ts";

import DataMapMain from "./thread_mem/DataMapMain.ts";
import DataMapChild from "./thread_mem/DataMapChild.ts";

import ConditionTranspiler from "./condition_transpiler/ConditionTanspiler.ts";

export default class AppNOP {
  #options: AppOptions = defaultAppOptions;
  #workers: Worker[] = [];
  #handler: MessageHandler = new MessageHandler([], {});
  #preLoadedNotifications: NOPNotification[] = [];
  /**
   * Initializes the application. It must be called at the beginning of the state-manager thread (main thread).
   * @param {numThreads} number, number of threads that will execute Rules.
   * @param {permissions} any, see Deno worker permissions for more details. The default value is "inherit".
   * @param {extensionsURLs} string[], urls of the extension procedures used in the Conditions of Rules. Url definition examples: new URL("./src/extensions/deepEqual.ts", import.meta.url).href, "https://deno.land/x/script_nop@v1.4.1/src/extensions/deepEqual.ts".
   * @param {rulesURL} string, a url string in the above definition pattern. it can point to a file that contains all the Rules or that imports all the files where the Rules are.
   * @param {onNotification} ((n:NOPNotification)=>void|Promise<void>)|undefined, a procedure that intercepts all notifications. You can for example save them in a history or print them on the screen as a debugger.
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
      "notify": async (msg: any, from: Worker | undefined) => { //main or child thread receives
        if (this.handler.isMainThread) { //if main thread receives
          this.onNotifications(msg);
        }
        for (const n of msg) {
          this.handleNotification(n, from); //without await, concurrent
        }
      },
      "apply-notification": async (msg: any, from: Worker | undefined) => { //child thread receives
        ConditionTranspiler.receiveToConditionNotification( //without await (concurrent).
          msg.to,
          msg.attributesToConditionsNotifications,
          msg.conditionsToConditionsNotifications,
          msg.mode,
        );
      },
    }, { //send to childs threads (init step 1)
      type: "",
      payload: {
        extensionsURLs: this.options.extensionsURLs,
      },
    }, async (main: Worker, msg: any): Promise<any> => { //child thread receives (init step 2)
      const toMainThreadMsgData: any = { rulesWithConditions: {} };
      for (const exUrl of msg.extensionsURLs) {
        const exLib = await import(exUrl);
        DataMapChild.registerExtensions([exLib.default]);
      }
      Rule.initialized = true;
      for (const r in DataMapChild.rules) {
        DataMapChild.rules[r].initialize();
        if (DataMapChild.rules[r].options.condition) {
          toMainThreadMsgData.rulesWithConditions[r] = true;
        }
      }
      return toMainThreadMsgData;
    }, async (child: Worker, msg: any): Promise<void> => { //main thread receives (init step 3)
      DataMapMain.rulesWithConditions = msg.rulesWithConditions;
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
    if (this.handler.isMainThread) {
      this.onNotifications(notifications);
    }
    if (target === "child") {
      this.handler.sendToRandomChildThread(
        {
          type: "notify",
          payload: notifications,
        },
      );
    } else if (target === "main") {
      if (this.handler.isMainThread) {
        for (const n of notifications) {
          this.handleNotification(n, undefined); //without await, concurrent
        }
      } else {
        this.handler.sendToMainThread(
          {
            type: "notify",
            payload: notifications,
          },
        );
      }
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
        n.mode,
      );
    } else if (n.from_type === "Attribute" && n.to_type === "Condition") { //main thread receives
      const hasChange = DataMapMain.addNotification(
        "attributesToConditionsNotifications",
        n.from.index,
        n.to.index,
        n.value,
        n.mode.includes("FORCE"),
      );
      if (hasChange) {
        this.handler.sendToRandomChildThread(
          {
            type: "apply-notification",
            payload: {
              to: n.to.index,
              attributesToConditionsNotifications: DataMapMain.getNotification(
                "attributesToConditionsNotifications",
                [n.to.index],
              ) ||
                {},
              conditionsToConditionsNotifications: DataMapMain.getNotification(
                "conditionsToConditionsNotifications",
                [n.to.index],
              ) ||
                {},
              mode: n.mode,
            },
          },
        );
      }
    } else if (n.from_type === "Condition" && n.to_type === "Condition") { //main thread receives
      const hasChange = DataMapMain.addNotification(
        "conditionsToConditionsNotifications",
        n.from.index,
        n.to.index,
        n.value,
        n.mode.includes("FORCE"),
      );
      if (hasChange) {
        this.handler.sendToRandomChildThread(
          {
            type: "apply-notification",
            payload: {
              to: n.to.index,
              attributesToConditionsNotifications: DataMapMain.getNotification(
                "attributesToConditionsNotifications",
                [n.to.index],
              ) ||
                {},
              conditionsToConditionsNotifications: DataMapMain.getNotification(
                "conditionsToConditionsNotifications",
                [n.to.index],
              ) ||
                {},
              mode: n.mode,
            },
          },
        );
      }
    } else if (n.from_type === "Condition" && n.to_type === "Rule") { //main thread receives
      const hasChange = DataMapMain.addSingleNotification(
        "conditionsToRulesNotifications",
        n.to,
        n.value,
        n.mode.includes("FORCE"),
      );
      if (hasChange) {
        this.#verifyRuleStateAndNotifyItsAction(n.to, "Condition");
      }
    } else if (n.from_type === "Rule" && n.to_type === "Action") { //child thread receives
      await DataMapChild.rules[n.to].notifyAction(n.value);
    } else if (n.from_type === "Action" && n.to_type === "Fact Base Element") { //main thread receives
      if (!DataMapMain.fbes[n.to]) {
        new FactBaseElement(n.to);
      }
      DataMapMain.fbes[n.to].notify(
        n.value.path,
        n.value.input,
        n.mode,
      );
    } else if (n.from_type === "Action" && n.to_type === "Rule") { //main thread receives
      if (!DataMapChild.rules[n.to]) {
        console.log(`Rule ${n.to} does not exist.`);
        return;
      }
      const hasChange = DataMapMain.addSingleNotification(
        "actionsToRulesNotifications",
        n.to,
        n.value,
        n.mode.includes("FORCE"),
      );
      if (hasChange) {
        this.#verifyRuleStateAndNotifyItsAction(n.to, "Action");
      }
    } else if (n.from_type === "Action" && n.to_type === "Attribute") { //main thread receives
      //No notification map here because Attributes are more related to an inference state than a managed state notifying entity
      if (!DataMapMain.fbes[n.to]) {
        new FactBaseElement(n.to);
      }
      const value = DataMapMain.fbes[n.to.fbe].get(
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
        mode: "FORCE",
      }], from as Worker);
    } else if (n.from_type === "Attribute" && n.to_type === "Action") { //main thread receives
      //No notification map here because Attributes are more related to an inference state than a managed state notifying entity
      DataMapChild.resolveAttrActionPromise(n.from.fbe, n.from.attr, n.value);
    }
  }
  onNotifications(entries: NOPNotification[]) {
    if (this.options.onNotification!) {
      const time = Date.now();
      for (const e of entries) {
        e.time = time;
        this.options.onNotification!(e); //without await (concurrent).
      }
    }
  }
  #verifyRuleStateAndNotifyItsAction(rule: string, originType: NOPEntity) {
    if (
      //Conditions must notify a js 'true' value for a Rule to activate it. Values ​​like false, '', null, 0 and undefined will be 'false'.
      (DataMapMain.getNotification("conditionsToRulesNotifications", [rule]) ||
        !DataMapMain.rulesWithConditions[rule])
    ) {
      //@ts-ignore
      const value: InferenceData = structuredClone({
        fromAction: DataMapMain.getNotification("actionsToRulesNotifications", [
          rule,
        ]),
        fromCondition: DataMapMain.getNotification(
          "conditionsToRulesNotifications",
          [rule],
        ),
        originType: originType,
      });
      const hasChange = DataMapMain.addSingleNotification(
        "rulesToActionsNotifications",
        rule,
        value,
        true, //FORCE is aways true (Rule -> Action)
      );
      if (hasChange) {
        this.notify([
          {
            from: rule,
            to: rule,
            from_type: "Rule",
            to_type: "Action",
            value: value,
            mode: "FORCE",
          },
        ], "child");
      }
    }
  }
  /**
   * Save all program state
   * @return {ProgramState} the program state.
   */
  saveProgramState(): ProgramState {
    const fbes: { name: string; data: { [key: string]: any } }[] = [];
    for (const f of DataMapMain.fbes) {
      fbes.push({ name: f.name, data: f.data });
    }
    return {
      fbes: fbes,
      notifications: DataMapMain.notifications,
    };
  }
  /**
   * Load program state
   * @param {ProgramState} state, program state data.
   */
  loadProgramState(state: ProgramState) {
    for (const fbe of state.fbes) {
      new FactBaseElement(fbe.name, fbe.data);
    }
    DataMapMain.notifications = state.notifications;
  }
}
