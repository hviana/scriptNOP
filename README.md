# scriptNOP

A framework for Notification Oriented Paradigm (NOP[[1]](#1)) implemented in
TypeScript.

In the notification Oriented Paradigm (NOP), there are the "factual and causal
smart-entities named as Fact Base Elements (FBEs) and Rules that are related to
another collaborative notifier smart-entities. Each FBE is related to Attributes
and Methods, whereas each Rule to Premises-Conditions and Actions-Instigations.
All these entities collaboratively carry out the inference process using
notifications, providing solutions to deficiencies of current paradigms"
[[1]](#1).

This implementation provides state-of-the-art features of NOP, in TypeScript,
exploring the current limits of object orientation and imperative programming,
parallel programming and concurrent programming. The implementation has no
dependencies on other libraries and can be used in any TypeScript/JavaScript
runtime or browsers. Also, this implementation is REACTIVE IN DEPTH and
optionally accepts FUZZY[[2]](#2) parameters and CUSTOM FUNCTIONS like sum of a
weighted input of a NEURON[[3]](#3), and you can still combine it all at the
same time.

## Contents

- [Sample application](#sample-application)
- [Defining Conditions](#defining-conditions)
  - [Condition with extensions](#condition-with-extensions)
  - [Combination of Conditions](#combination-of-conditions)
- [Rules](#rules)
- [Instructions to run this project](#instructions-to-run-this-project)
- [Particularities of this implementation](#particularities-of-this-implementation)
- [References](#references)
- [About](#about)

## Sample application

This program contains an example of an application named "Target shooting".
There is the main thread (state manager), where all the Fact Base Elements are,
and there are the secondary threads where the Rules are.

main.ts (main thread):

```typescript
import {
  App,
  delay,
  FactBaseElement,
} from "https://deno.land/x/script_nop/mod.ts";
App.init({
  numThreads: 1,
  extensionsURLs: [ //for URL to local file: new URL("./my_file.js", import.meta.url).href
    "https://deno.land/x/script_nop/src/extensions/deepEqual.ts",
  ],
  rulesURL: "https://deno.land/x/script_nop/example/rules.ts",
  onNotification: (n: any) => console.log(n), //Using history as a debugger
});
/*
  * Example: Target shooting aplication
  */
class Shooter extends FactBaseElement {
  constructor(fbeName: string) {
    super(fbeName);
  }
  shoot() {
    super.notify(
      "", //path
      {
        gun: {
          bullets: 5,
          pull_trigger: false,
        },
        target: false,
      },
    );
  }
}
const shooter1 = new Shooter("shooter1_name");
shooter1.shoot();
```

rules.ts (secondary threads):

```typescript
import { Rule } from "https://deno.land/x/script_nop/mod.ts";
const rule1 = new Rule(
  {
    name: "rule1_name",
    condition: {
      premise: {
        fbe: "shooter1_name",
        attr: "gun.bullets",
        is: ">",
        value: 0,
      },
    },
    action: async (fbes: any) => {
      console.log("loaded gun!!!");
      const bullets = await fbes("shooter1_name").get("gun.bullets"); // get FBE Attribute value (using notifications between Attributes and Actions).
      fbes("shooter1_name").notify( // notify FBE, changes will be automatically sent to the state manager thread.
        "", //path
        {
          target: true,
        },
        "IGNORE_MISSING", //with "IGNORE_MISSING" mode, Attributes missing in "input" (in depth) will not be considered as excluded.
      );
      //Action to Rule notifications are control mechanisms for the NxN relationship between Rules.
      return { gun_loaded: true }; //send notification to the state manager thread, if you have Rules that depend on this Rule activated, they will also receive this notification.
    },
  },
);
```

FBEs do not necessarily need to be instantiated. If an FBE does not exist when
being re-referenced by another entity of the NOP core, its instance is created
automatically

## Defining Conditions

Conditions are implemented in a tree structure, easy for humans to understand.
Note that the "." is reserved in this implementation for path notation, and this
implementation handles circular references. Conditions must notify a language
'true' value for a Rule to activate it. Values ​​like '', null, 0 and undefined
will be 'false'. See examples of Conditions:

```typescript
//------------------------- TYPES OF CONDITIONS ----------------------
//----------------WITH ONE PREMISE:
const c: Condition = {
  premise: {
    fbe: "shooter1_name", //Fact Base Element name.
    attr: "target.person.age", //path notation
    is: ==, //"==", ">", "<", etc. Or: function name (registered extension).
    value: true, //non-reactive constant.
  },
}
//----------------WITH ONE PREMISE (WITH REACTIVE VALUE):
const c: Condition = {
  premise: {
    fbe: "shooter1_name", //Fact Base Element name.
    attr: "target.person.age", //path notation
    is: ==, //"==", ">", "<", etc. Or: function name (registered extension).
    value: { //reactive Attribute
      fbe: "shooter2_name",
      attr: "target.person.age",
    },
  }
}
//----------------WITH ONE SELF-EVALUATED PREMISE:
//The value of the respective attr is already the result of the Premise.
const c: Condition = {
  premise: {
    fbe: "shooter2_name", //Fact Base Element name.
    attr: "target.person.age" //path notation.
  }
}
const c: Condition = {
  premise: {
    fbe: "layer1_name", //Fact Base Element name.
    attr: "neurons.0", //path notation.
    is: "sumOfWeights", //custom function name, function out is result of the Premise, FBE.attr is input of function
  }
}
//----------------WITH OR, AND, XOR
const c: Condition = {
  and: [ //keys: "or", "and", "xor"
    //ARRAY of sub Conditions.
  ]
}
//----------------WITH custom function
const c: Condition = {
  is: "+", // "function name (registered extension) or operator (+, *, etc)",
  sub_conditions: [ //this vector is the input parameter of the function
    //ARRAY of sub Conditions.
  ]
}
//----------------WITH negation
const c: Condition = {
  not: c2, //c2 is one object of type Condition.
}
//----------------WITH OPTIONAL parameters ​​for FUZZY logic:
//Fuzzy parameters are optional and combinable with any type of Condition.
const c: Condition = {
  // ... (Condition parameters) ...
  min_threshold: 0.2, //number (or reactive Attribute) for fuzzy logic (optional), "if Condition < min_threshold".
  max_threshold: 0.8, //number (or reactive Attribute) for fuzzy logic (optional), "if Condition > max_threshold", you can set a defined range, defining min_threshold and max_threshold at the same time.
}
const c: Condition = {
  // ... (Condition parameters) ...
  exactly: 0.5, //number (or reactive Attribute) for fuzzy logic (optional), the result of the expression must be equal to the value.
}
*/
```

### Condition with extensions

There is also an extension interface for named functions, which are used as
cuttomized functions in Premises and Conditions. These extensions are defined at
the beginning of the main thread by the "extensionsURLs" parameter, but they can
also be defined manually in the Rules file:

```typescript
DataMapChild.registerExtensions([customFunc2]);
```

How to use extensions:

```typescript
/*
In Premises:
deepEqual = function with name "deepEqual", ex: export default function deepEqual(items: any[]): any { ...
"items" is the result of "FBE.attr" (index 0) and the result of "FBE.value" (index 1); the vector is size 2 or size 1 for self-evaluated Premises.
*/
const c: Condition = {
  premise: {
    fbe: "shooter1_name",
    attr: "character",
    is: "deepEqual", //FUNCTION NAME HERE
    value: { name: "joe", age: 25 }, //Non-reactive CONSTANT, but it could also be an Attribute
  },
};
/*
In Conditions:
custonFunc = function with name "custonFunc2", ex: export default function custonFunc2(items: any[]): any { ...
"items" is an array of result of Conditions ("sub_conditions" parameter).
*/
const c: Condition = {
  is: "customFunc2", //FUNCTION NAME HERE, the "is" can also be operators like "+", "*", etc. Operators like "and" must be represented by their name in the language ("&&").
  sub_conditions: [ //"sub_conditions" only exists when the "is" attribute in a Condition is filled
    {
      premise: {
        fbe: "shooter1_name",
        attr: "gun.bullets",
        is: "==",
        value: true, //Non-reactive constant, but it could also be an Attribute.
      },
    },
  ],
};
```

### Combination of Conditions

A combination of different types of Conditions together is possible. Example
with simple logic, fuzzy logic and custom functions:

```typescript
const c: Condition = {
  or: [
    {
      not: {
        is: "ReLU", //custom function name in Condition, input is sub_conditions Array
        sub_conditions: [
          {
            premise: {
              fbe: "layer1_name",
              attr: "neurons.0", //paths with .N is valid for vectors
              is: "sumOfWeights", //custom function name in Premise, input is FBE.attr
            },
          },
        ],
      },
    },
    {
      premise: {
        fbe: "shooter1_name",
        attr: "gun.distance",
      },
      min_threshold: 0.2, //fuzzy parameter, combinable with any type of Condition
    },
    {
      premise: {
        fbe: "shooter1_name",
        attr: "gun.pull_trigger",
        is: "==", //simple logic
        value: true,
      },
    },
  ],
};
```

In the library package the extension functions "deepEqual", which checks in
depth if two objects are the same, i.e. compares their parameters, subparameters
and etc. It is possible for example an extension function that represents a sum
of weighted weights of a neuron, it can also be combined with fuzzy logic for
the activation threshold of the same.

## Rules

See also options for instantiating a **Rule**:

```typescript
export type RuleOptions = {
  name: string;
  condition: Condition;
  action: (
    fbes: FBEsFunc,
  ) => Promise<any> | any;
  delay?: number;
  depends?: string[];
};
```

## Instructions to run this project

Basically you just need to clone the project and install the Deno runtime.

```console
# clone project
git clone https://github.com/hviana/scriptNOP.git
# enter the project directory
cd scriptNOP
# install Deno (Mac, Linux)
curl -fsSL https://deno.land/install.sh | sh
# install Deno (Windows/PowerShell)
iwr https://deno.land/install.ps1 -useb | iex
# run project example:
deno run --unstable --allow-read --allow-net --allow-write main.ts
# bundle scriptNOP lib to any runtime or web browsers:
deno bundle mod.ts nop.js
```

## Particularities of this implementation

The framework has several facilities for the developer. Conditions can be
composed of SubConditions and can have parameters coming from Attributes
notifications, such as fuzzy parameters. Actions have a paradigm-independent
nature and are represented directly by a reference to a procedure. This Action
procedure can directly notify values to FBEs in order to make changes to the
fact base, and notify and receive notifications from Attributes in order to read
the fact base. Finally, a Rule can have other N Rules as dependencies or be a
dependency for other N Rules (NxN cardinality).

To support all these features, the core of the original NOP was modified.
Basically, the Instigations and Methods entities were removed, and several new
notification paths were added. For the composition between Conditions,
notifications from Conditions to Conditions were created. For the parameters of
Conditions, notifications of Attributes for Conditions were created.

Actions, since they are a direct reference to a paradigm-independent procedure,
need a drastic amount of modifications. When using imperative programming
mechanisms, for example, it is unpredictable to know what the code execution
flow will be since there may be, for example, code suspension mechanisms such as
an "IF", making it impossible to predict which notifications will be sent and
received by this Action procedure. To solve this problem, this Action procedure
has access to routines that explicitly notify and receive notifications. When
needing an Attribute, there is an asynchronous routine named "get" that sends a
notification to the respective Attribute that symbolizes a request to its
current value, and the Attribute sends to the Action procedure a notification
with its current value that is captured by the routine "get". In the end, the
"get" routine returns the current value of the Attribute inside the Action
procedure. To notify FBEs, there is also a routine named "notify", which
transmits to an FBE a notification containing a set of new values ​​for that
FBE.

To implement the NxN cardinality dependency between Rules, Actions for Rules
notifications are also implemented. When an Action of a Rule "R1" finishes its
execution, it notifies all Rules that have "R1" as a dependency.

FBEs notify attributes in depth. That is, if an Attribute "A2" is inside the
Attribute "A1", notifications about "A2" will trigger notifications about "A1".
It is possible to visualize the behavior:

```typescript
//initial values.
fbe.notify(
  {
    a: {
      b: {
        c: "foo",
      },
      d: true,
    },
  },
);
/*
Premises that use "a", "a.b" or "a.b.c" will be notified.
Premises that use only "a.d" are not notified, since
the value of "a.d" has not been modified.
*/
fbe.notify(
  {
    a: {
      b: {
        c: "bar",
      },
      d: true,
    },
  },
);
await fbe.get("a.b"); //returns "a.b" Attribute.
```

The framework also has a debugger function that intercepts all notifications
between NOP core entities. In this way, it is possible, for example, to save
this information in a history or print it on the screen.

An application with this framework can result in a "freeze" of the program if
infinite changes of Fact Base Elements states start, given the respective
Actions. To minimize this problem and at the same time implement the priority
idea of Actions and Rules, when creating a Rule it is possible to insert an
optional delay for its Action. Note that there is no need for a "Dispatcher" to
queue notifications, as such notifications are implemented using async functions
with delay.

The code is very dense, although every detail has been thought of in order to
favor readability and avoid replication. With TypeScript, we have a new way of
defining types and programming in an object-oriented style compared to classic
object-oriented languages ​​such as Java and C++, which drastically reduces the
amount of code. See the following code snippet:

```typescript
export interface Attribute {
  fbe: string;
  attr: string;
}
export interface Premise extends Attribute {
  is: string;
  value: any | Attribute;
}
// ...
interface ConditionWithXor extends FuzzyCondition {
  xor: [Condition, Condition, ...Condition[]]; //min 2 Conditions
}
export type Condition =
  | ConditionWithNot
  | ConditionWithPremise
  | ConditionWithAnd
  | ConditionWithOr
  | ConditionWithXor
  | ConditionWithFunc;
//...
export class Rule {
  static appInitialized: boolean = false;
  static initialized: boolean = false;
  #conditionTranspiler: ConditionTranspiler;
```

## References

<a id="1">[1]</a> J. M. Simão, C. A. Tacla, P. C. Stadzisz and R. F.
Banaszewski, "Notification Oriented Paradigm (NOP) and Imperative Paradigm: A
Comparative Study," Journal of Software Engineering and Applications, Vol. 5 No.
6, 2012, pp. 402-416. doi: https://www.doi.org/10.4236/jsea.2012.56047

<a id="2">[2]</a> Melo, Luiz Carlos & Fabro, João & Simão, Jean. (2015).
Adaptation of the Notification Oriented Paradigm (NOP) for the Development of
Fuzzy Systems. Mathware& Soft Computing. 22. 1134-5632. url:
https://www.researchgate.net/publication/279178301_Adaptation_of_the_Notification_Oriented_Paradigm_NOP_for_the_Development_of_Fuzzy_Systems

<a id="3">[3]</a> F. Schütz, J. A. Fabro, C. R. E. Lima, A. F. Ronszcka, P. C.
Stadzisz and J. M. Simão, "Training of an Artificial Neural Network with
Backpropagation algorithm using Notification Oriented Paradigm," 2015 Latin
America Congress on Computational Intelligence (LA-CCI), 2015, pp. 1-6, doi:
https://doi.org/10.1109/LA-CCI.2015.7435978

## About

Author: Henrique Emanoel Viana, a Brazilian computer scientist, enthusiast of
web technologies, cel: +55 (41) 99999-4664. URL:
https://sites.google.com/site/henriqueemanoelviana

Improvements and suggestions are welcome!
