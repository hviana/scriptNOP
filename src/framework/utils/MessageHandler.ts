/*
Created by: Henrique Emanoel Viana
Github: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/

import { ThreadHandlers, ThreadMessage } from "../ts/types.ts";

export default class MessageHandler {
  #workers: Worker[];
  #handlers: ThreadHandlers;
  #loadedWorkers: Worker[] = [];
  get loadedWorkers() {
    return this.#loadedWorkers;
  }
  get handlers() {
    return this.#handlers;
  }
  constructor(
    childThreads: Worker[],
    handlers: ThreadHandlers = {},
    onCoreLoad: ThreadMessage = {
      type: "",
      payload: {},
    },
    onCoreLoadedChild: (
      main: Worker,
      msg: any,
    ) => Promise<any> | any = (main: Worker, msg: any) => undefined,
    onCoreLoadedMain: (
      child: Worker,
      msg: any,
    ) => Promise<void> | void = (child: Worker, msg: any) => undefined,
  ) {
    for (const w of childThreads) {
      w.onmessage = async (e) => {
        await this.receive(e.data, w);
      };
    }
    this.#workers = childThreads;
    this.#handlers = handlers;
    onCoreLoad.type = "core-loaded-finished-child";
    this.#handlers["core-loaded"] = async (
      msg: any,
      from: Worker | undefined,
    ) => { //main thread receives
      this.sendToChildThread(from, onCoreLoad);
    };
    this.#handlers["core-loaded-finished-child"] = async (
      msg: any,
      from: Worker | undefined,
    ) => { //child thread receives
      const payload = await onCoreLoadedChild(from, msg);
      this.sendToMainThread({
        type: "core-loaded-finished-main",
        payload: payload,
      });
    };
    this.#handlers["core-loaded-finished-main"] = async (
      msg: ThreadMessage,
      from: Worker | undefined,
    ) => { //main thread receives
      await onCoreLoadedMain(from, msg);
      this.#loadedWorkers.push(from);
    };
    //@ts-ignore
    self.onmessage = async (e) => {
      await this.receive(e.data, undefined);
    };
  }
  initialize() { //child thread message handler loaded
    if (!this.isMainThread) {
      this.sendToMainThread({
        type: "core-loaded",
        payload: {},
      });
    }
  }
  get allThreadsLoaded(): boolean {
    return (this.#workers.length === this.#loadedWorkers.length);
  }
  get noThreadsLoaded(): boolean {
    return (this.#loadedWorkers.length === 0);
  }
  get isMainThread(): boolean {
    return (this.#workers.length > 0);
  }
  async receive(msg: ThreadMessage, from: Worker | undefined) {
    await this.#handlers[msg.type](msg.payload, from);
  }
  sendToChildThread(worker: Worker, msg: ThreadMessage) {
    worker.postMessage(msg);
  }
  sendToMainThread(msg: ThreadMessage) {
    //@ts-ignore
    self.postMessage(msg);
  }
  sendToRandomChildThread(msg: ThreadMessage) {
    if (this.#loadedWorkers.length > 0) {
      const selectedWorker: number = Math.floor(
        Math.random() * this.#loadedWorkers.length,
      );
      this.sendToChildThread(this.#loadedWorkers[selectedWorker], msg);
    }
  }
  sendToAllChildThreads(msg: ThreadMessage) {
    for (const w of this.#loadedWorkers) {
      this.sendToChildThread(w, msg);
    }
  }
}
