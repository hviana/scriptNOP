/*
Created by: Henrique Emanoel Viana
Github: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/

import AppNOP from "../AppNOP.ts";

import {
  ActionNotifier,
  AppOptions,
  InferenceData,
  RuleOptions,
} from "./types.ts";

const defaultRuleOptions: RuleOptions = {
  name: "",
  condition: undefined,
  action: (
    notifier: ActionNotifier,
    inferenceData: InferenceData,
  ) => undefined,
};

const defaultAppOptions: AppOptions = {
  numThreads: 1,
  permissions: "inherit",
  extensionsURLs: [],
  rulesURL: "",
  onNotification: undefined,
};

const App = new AppNOP();

export { App, defaultAppOptions, defaultRuleOptions };
