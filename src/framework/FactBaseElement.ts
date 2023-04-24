/*
Created by: Henrique Emanoel Viana
Github: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/

import diff from "../libs/diff_lib.ts";

import { NOPNotification, NotificationMode } from "./ts/types.ts";
import { App } from "./ts/constants.ts";
import DataMapMain from "./thread_mem/DataMapMain.ts";

export default class FactBaseElement {
  #data: { [key: string]: any } = {};
  static #pathSep: string = ".";
  #name: string;
  /**
   * @param {name} string, Fact Base Element name, must be unique for each instance.
   * @param {initialData} any, Initial values ​​for the Fact Base Element.
   */
  constructor(
    name: string,
    initialData: { [key: string]: any } = {},
  ) {
    if (!name) {
      throw new Error(
        `Fact Base Element: name "${name}" is invalid.`,
      );
    }
    this.#data = initialData;
    this.#name = name;
    const exists = DataMapMain.addFBE(this);
    if (exists) {
      if (Object.keys(initialData).length > 0) {
        console.log(
          `FBE already exists, parameter 'initialData' will be ignored.`,
        );
      }
      this.#data = exists.data;
    }
  }
  get name() {
    return this.#name;
  }
  get data() {
    return this.#data;
  }
  #subPathsInStr(
    obj: any,
    parentPath: string = "",
    parents: Set<any> = new Set(),
    subPaths: string[] = [],
  ): string[] {
    if (typeof obj === "object") {
      parents.add(obj);
      parents = new Set(parents);
      for (const k in obj) {
        const path = parentPath + FactBaseElement.#pathSep + k;
        subPaths.push(path);
        if (!parents.has(obj[k])) {
          this.#subPathsInStr(obj[k], path, parents, subPaths);
        }
      }
    }
    return subPaths;
  }
  #fromPath(obj: any, path: (string | number)[]): any {
    return path.reduce(
      (o, key) => typeof o === "object" && key in o ? o[key] : undefined,
      obj,
    );
  }
  #deleteFromPath(obj: any, path: (string | number)[]): void {
    const last = path[path.length - 1];
    const parent = path.length < 2 ? obj : this.#fromPath(
      obj,
      path.slice(0, path.length - 1),
    );
    if (Array.isArray(parent)) {
      parent.splice(last as number, 1);
    } else {
      delete parent[last as string];
    }
  }
  #setFromPath(obj: any, path: (string | number)[], value: any): void {
    const limit = path.length - 1;
    for (let i = 0; i < limit; ++i) {
      const key = path[i];
      obj = obj[key] ?? (obj[key] = {});
    }
    const key = path[limit];
    obj[key] = value;
  }
  #superPathsInStr(path: (string | number)[]): string[] {
    const res = [];
    for (const i in path) {
      //@ts-ignore
      res.push(path.slice(0, parseInt(i) + 1).join(FactBaseElement.#pathSep));
    }
    return res;
  }
  #changedPaths(input: any, diffs: any[]): Set<string> {
    const changedAttrNames = new Set<string>();
    for (const diff of diffs) {
      var dataRef = this.#data;
      if (diff.type === "CREATE") {
        dataRef = input;
      } else if (diff.type === "CHANGE") {
        if ((typeof diff.value) !== (typeof diff.oldValue)) {
          if ((typeof diff.value) === "object") {
            dataRef = input;
          }
        }
      }
      const changedPaths: string[] = [
        ...this.#superPathsInStr(diff.path),
        ...this.#subPathsInStr(
          this.#fromPath(dataRef, diff.path),
          diff.path.join(FactBaseElement.#pathSep),
        ),
      ];
      for (const p of changedPaths) {
        changedAttrNames.add(p);
      }
    }
    return changedAttrNames;
  }
  #applyChanges(diffs: any[]) {
    for (const diff of diffs) {
      if (diff.type === "CREATE" || diff.type === "CHANGE") {
        this.#setFromPath(this.#data, diff.path, diff.value);
      } else if (diff.type === "REMOVE") {
        this.#deleteFromPath(this.#data, diff.path);
      }
    }
  }

  /**
   * Notifies Attributes in depth.
   * @param {path} string, input path, such as "a", "a.b" or "a.c.0.d" (wit array).
   * @param {input} {[key:string]:any}|any[], the input value, eg { foo: "bar" }, [1, 2, 3]. Must be an object or array.
   * @param {mode} NotificationMode, optional, if mode includes "IGNORE_MISSING", Attributes missing in "input" (in depth) will not be considered as excluded.
   * 					             if mode includes "FORCE" Notifications will be even if the values of these Notifications are not modified (there is no change in the status of the notifiable entity).
   */
  notify(
    path: string = "",
    input: { [key: string]: any } | any[],
    mode: NotificationMode = "",
  ): void {
    var diffs: any[] = [];
    if (path) {
      const pathArry: string[] = path.split(FactBaseElement.#pathSep);
      if (!this.#fromPath(this.#data, pathArry)) {
        this.#setFromPath(this.#data, pathArry, Array.isArray(input) ? [] : {});
      }
      diffs = diff(
        this.#fromPath(this.#data, pathArry),
        input,
        { ignoreMissing: mode.includes("IGNORE_MISSING"), cyclesFix: true },
      );
      diffs.map((d: any) => d.path = [...pathArry, ...d.path]);
      const inputObj: { [key: string]: any } = {};
      this.#setFromPath(
        inputObj,
        pathArry,
        input,
      );
      input = inputObj;
    } else {
      if (Array.isArray(input)) {
        throw new Error(
          `Use Arrays as input only with "path" parameter.`,
        );
      }
      diffs = diff(this.#data, input, {
        ignoreMissing: mode.includes("IGNORE_MISSING"),
        cyclesFix: true,
      });
    }
    var changedAttrNames = new Set<string>();
    if (mode.includes("FORCE")) {
      changedAttrNames = this.#changedPaths(input, [
        ...diffs,
        ...diff({}, input),
      ]);
    } else {
      changedAttrNames = this.#changedPaths(input, diffs);
    }
    this.#applyChanges(diffs);
    const notifications: NOPNotification[] = [];
    for (const attr of changedAttrNames) {
      notifications.push(
        {
          from: this.name,
          to: attr,
          from_type: "Fact Base Element",
          to_type: "Attribute",
          //@ts-ignore
          value: structuredClone(
            this.#fromPath(this.#data, attr.split(FactBaseElement.#pathSep)),
          ),
          mode: mode,
        },
      );
    }
    App.notify(notifications, "child");
  }

  /**
   * Get an attribute.
   * @param {attr} string, the attribute name in path notation, such as "a", "a.b" or "a.c.0.d" (wit array).
   * @return {any} the attribute value.
   */
  get(attr: string): any { //path notation
    if (!attr) {
      return this.#data;
    }
    return this.#fromPath(this.#data, attr.split(FactBaseElement.#pathSep));
  }
}
