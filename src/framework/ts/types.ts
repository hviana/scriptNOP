/*
Created by: Henrique Emanoel Viana
Github: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/

import ActionNotifier from "../ActionNotifier.ts";

export type ProgramState = {
  fbes: { name: string; data: { [key: string]: any } }[];
  notifications: {
    [key: string]: NOPNotifications;
  };
};

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
export interface FuzzyParameters {
  min_threshold?: number | Attribute;
  max_threshold?: number | Attribute;
  exactly?: number | Attribute;
}
export interface ConditionWithAttribute {
  attribute: Attribute;
}
export interface ConditionAsPremise {
  left: Condition;
  is: string;
  right: Condition;
}
export interface ConditionWithConstant {
  constant: any;
}
export interface ConditionWithNot {
  not: Condition;
}
export interface ConditionWithAnd {
  and: [Condition, Condition, ...Condition[]];
}
export interface ConditionWithOr {
  or: [Condition, Condition, ...Condition[]];
}
export interface ConditionWithXor {
  xor: [Condition, Condition, ...Condition[]]; //min 2 conditions
}
export interface ConditionWithRef {
  ref: string;
}
export interface ConditionWithFunc {
  op: string;
  sub_conditions: Condition[];
}

export type Condition =
  & (
    | ConditionWithAttribute
    | ConditionAsPremise
    | ConditionWithConstant
    | ConditionWithNot
    | ConditionWithAnd
    | ConditionWithOr
    | ConditionWithXor
    | ConditionWithFunc
    | ConditionWithRef
  )
  & FuzzyParameters;

export type InferenceData = {
  fromAction: any;
  fromCondition: any;
};

export type RuleOptions = {
  name: string;
  condition?: Condition;
  action: (
    notifier: ActionNotifier,
    inferenceData: InferenceData,
  ) => Promise<any> | any;
};

export type AppOptions = {
  numThreads?: number;
  permissions?: any;
  extensionsURLs?: string[];
  rulesURL?: string;
  onNotification?: ((n: NOPNotification) => void | Promise<void>) | undefined;
};

export type MapEntry = string | number;

export type NOPNotifications = { [key: MapEntry]: any };

export type MultiLevelMap = {
  [key: MapEntry]: MultiLevelMap | MapEntry;
};

export type NOPEntity =
  | "Fact Base Element"
  | "Attribute"
  | "Condition"
  | "Rule"
  | "Action";

export type NotifyingElement = MapEntry | Attribute | {
  index: MapEntry;
  condition: Condition;
} | {
  index: MapEntry;
  attribute: Attribute;
};
export type NotificationMode =
  | "IGNORE_MISSING"
  | "FORCE"
  | "IGNORE_MISSING_AND_FORCE"
  | "";
export type NOPNotification = {
  from: NotifyingElement;
  to: NotifyingElement;
  value: any;
  mode: NotificationMode;
  from_type: NOPEntity;
  to_type: NOPEntity;
  time?: number;
};
