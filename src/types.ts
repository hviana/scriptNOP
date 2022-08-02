import AppNOP from "./AppNOP.ts";

import FactBaseElement from "./FactBaseElement.ts";

// ----------------- TYPES

export type FBEsFunc = (name: string) => FactBaseElement;

export type ThreadMessage = {
  type: string;
  payload: any;
};

export type ThreadHandlers = {
  [key: string]: (
    payload: any,
    from: Worker | undefined,
  ) => void | Promise<void>;
};

export interface Attribute {
  fbe: string;
  attr: string;
}
export interface Premise extends Attribute {
  is?: string;
  value?: any | Attribute;
}
export interface FuzzyCondition {
  min_threshold?: number | Attribute;
  max_threshold?: number | Attribute;
  exactly?: number | Attribute;
}
export interface ConditionWithFunc extends FuzzyCondition {
  is: string;
  sub_conditions: Condition[];
}
export interface ConditionWithNot extends FuzzyCondition {
  not: Condition;
}
export interface ConditionWithPremise extends FuzzyCondition {
  premise: Premise;
}
export interface ConditionWithAnd extends FuzzyCondition {
  and: [Condition, Condition, ...Condition[]];
}
export interface ConditionWithOr extends FuzzyCondition {
  or: [Condition, Condition, ...Condition[]];
}
export interface ConditionWithXor extends FuzzyCondition {
  xor: [Condition, Condition, ...Condition[]]; //min 2 conditions
}
export type Condition =
  | ConditionWithNot
  | ConditionWithPremise
  | ConditionWithAnd
  | ConditionWithOr
  | ConditionWithXor
  | ConditionWithFunc;

export type RuleOptions = {
  name: string;
  condition: Condition;
  action: (
    fbes: FBEsFunc,
  ) => Promise<any> | any;
  delay?: number;
  depends?: string[];
};

export type FactsContext = { name: string; data: any }[];
export type NOPNotifications = { [key: string]: any | NOPNotifications };

export type AppOptions = {
  numThreads?: number;
  permissions?: any;
  extensionsURLs?: string[];
  rulesURL?: string;
  onNotification?: ((n: NOPNotification) => void | Promise<void>) | undefined;
};

export type NOPEntity =
  | "Fact Base Element"
  | "Attribute"
  | "Premise"
  | "Condition"
  | "Rule"
  | "Action";

export type NOPNotification = {
  from: any;
  to: any;
  value: any;
  from_type: NOPEntity;
  to_type: NOPEntity;
  time?: number;
  log?: boolean;
};

export type MapEntry = string | number;

export type MultiLevelMap = {
  [key: MapEntry]: MultiLevelMap | MapEntry;
};

// ----------------- CONSTANTS

const defaultRuleOptions: RuleOptions = {
  name: "",
  condition: { is: "+", sub_conditions: [] },
  action: (
    context: { [key: string]: FactBaseElement },
  ) => undefined,
  delay: 0,
  depends: [],
};

const defaultAppOptions = {
  numThreads: 1,
  permissions: "inherit",
  extensionsURLs: [],
  rulesURL: "",
  onNotification: undefined,
};

const App = new AppNOP();

export { App, defaultAppOptions, defaultRuleOptions };
