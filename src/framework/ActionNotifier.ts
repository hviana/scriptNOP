/*
Created by: Henrique Emanoel Viana
Github: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/

import { Attribute, NOPNotification, NotificationMode } from "./ts/types.ts";
import DataMapChild from "./thread_mem/DataMapChild.ts";
import { App } from "./ts/constants.ts";

export default class ActionNotifier {
  #action: string;
  constructor(action: string) {
    this.#action = action;
  }
  /**
   * Notifies FBE -> Attributes in depth.
   * @param {fbe} string, FBE name.
   * @param {path} string, input path, such as "a", "a.b" or "a.c.0.d" (wit array).
   * @param {input} {[key:string]:any}|any[], the input value, eg { foo: "bar" }, [1, 2, 3]. Must be an object or array.
   * @param {mode} NotificationMode, optional, if mode includes "IGNORE_MISSING", Attributes missing in "input" (in depth) will not be considered as excluded.
   * 					             if mode includes "FORCE" Notifications will be even if the values of these Notifications are not modified (there is no change in the status of the notifiable entity).
   */
  notifyFBE(
    fbe: string,
    path: string = "",
    input: { [key: string]: any } | any[],
    mode: NotificationMode = "",
  ) {
    App.notify([
      {
        from: this.#action,
        to: fbe,
        from_type: "Action",
        to_type: "Fact Base Element",
        value: {
          path: path,
          input: input,
        },
        mode: mode,
      },
    ], "main");
  }
  /**
   * Notifies Rules.
   * @param {rule} string, Rule name.
   * @param {value} any, notification value.
   * @param {mode} NotificationMode, optional, if mode includes "FORCE" Notifications will be even if the values of these Notifications are not modified (there is no change in the status of the notifiable entity).
   */
  notifyRule(rule: string, value: any, mode: NotificationMode = "") {
    App.notify(
      [
        {
          from: this.#action,
          to: rule,
          from_type: "Action",
          to_type: "Rule",
          value: value,
          mode: mode,
        },
      ],
      "main",
    );
  }
  /**
   * Notifies an Attribute requesting its value and returns the Attribute notification with the value.
   * @param {attribute} Attribute object type.
   * @return {Promize<any>} the Attribute value.
   */
  async notifyAttrAndWaitReply(attribute: Attribute): Promise<any> {
    const p: Promise<any> = DataMapChild.getAttrActionPromise(
      attribute.fbe,
      attribute.attr,
    );
    App.notify([
      {
        from: this.#action,
        to: attribute,
        from_type: "Action",
        to_type: "Attribute",
        value: null,
        mode: "FORCE",
      },
    ], "main");
    return p;
  }
}
