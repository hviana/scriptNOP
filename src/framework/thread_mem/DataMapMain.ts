/*
Created by: Henrique Emanoel Viana
Github: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/

import { MapEntry, NOPNotifications } from "../ts/types.ts";

import FactBaseElement from "../FactBaseElement.ts";

import deepEqual from "../../extensions/deepEqual.ts";

export default class DataMapMain {
  static fbes: { [key: string]: FactBaseElement } = {};
  static rulesWithConditions: { [key: string]: boolean } = {};

  static notifications: { [key: string]: NOPNotifications } = {};

  static getNotification(map: string, entries: MapEntry[]): any {
    var ref: any = DataMapMain.notifications[map];
    if (!ref) {
      return undefined;
    }
    for (const e of entries) {
      if (ref[e]) {
        ref = ref[e];
      } else {
        return undefined;
      }
    }
    return ref;
  }

  static addFBE(fbe: FactBaseElement): FactBaseElement | void {
    if (DataMapMain.fbes[fbe.name]) {
      return DataMapMain.fbes[fbe.name];
    }
    DataMapMain.fbes[fbe.name] = fbe;
  }
  static addSingleNotification(
    map: string,
    to: MapEntry,
    value: any,
    force: boolean = false,
  ): boolean {
    if (!DataMapMain.notifications[map]) {
      DataMapMain.notifications[map] = {};
    }
    var hasChange = false;
    if (!(to in DataMapMain.notifications[map])) {
      hasChange = true;
    } else if (force) {
      hasChange = true;
    } else if (!deepEqual([DataMapMain.notifications[map][to], value])) {
      hasChange = true;
    }
    DataMapMain.notifications[map][to] = value;
    return hasChange;
  }
  static addNotification(
    map: string,
    from: MapEntry,
    to: MapEntry,
    value: any,
    force: boolean = false,
  ): boolean {
    if (!DataMapMain.notifications[map]) {
      DataMapMain.notifications[map] = {};
    }
    var hasChange = false;
    if (!(to in DataMapMain.notifications[map])) {
      DataMapMain.notifications[map][to] = {};
      hasChange = true;
    } else {
      if (!(from in DataMapMain.notifications[map][to])) {
        hasChange = true;
      } else if (force) {
        hasChange = true;
      } else if (
        !deepEqual([DataMapMain.notifications[map][to][from], value])
      ) {
        hasChange = true;
      }
    }
    DataMapMain.notifications[map][to][from] = value;
    return hasChange;
  }
}
