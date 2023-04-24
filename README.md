# Warning

The project has been changed to: https://github.com/hviana/miniNOP

This project had a fundamental idea that could not be expressed. So it ended up
becoming a "crazy" framework where the original NOP core entities work in a
weird way. Given this problem, the study with the development of this framework
allowed the creation of a generic notifying structure called "notifying cell",
and from this structure a more coherent framework was created.

# scriptNOP

A framework for Notification Oriented Paradigm (NOP[[1]](#1)) implemented in
TypeScript.

In the Notification Oriented Paradigm (NOP), there are the "factual and causal
smart-entities named as Fact Base Elements (FBEs) and Rules that are related to
another collaborative notifier smart-entities. Each FBE is related to Attributes
and Methods, whereas each Rule to Premises-Conditions and Actions-Instigations.
All these entities collaboratively carry out the inference process using
Notifications, providing solutions to deficiencies of current paradigms"
[[1]](#1).

This implementation provides state-of-the-art features of NOP, in TypeScript,
exploring the current limits of object orientation and imperative programming,
parallel programming and concurrent programming. The implementation has no
dependencies on other libraries and can be used in any TypeScript/JavaScript
runtime or browsers.

## Contents

- [Sample application](#sample-application)
- [Defining Conditions](#defining-conditions)
  - [Condition with extensions](#condition-with-extensions)
  - [Combination of Conditions](#combination-of-conditions)
- [Instructions to run this project](#instructions-to-run-this-project)
- [Particularities of this implementation](#particularities-of-this-implementation)
  - [Multithreaded and concurrent approach used](#multithreaded-and-concurrent-approach-used)
  - [Comparison of existing concepts in the literature and new ones in relation to materializations of the NOP](#comparison-of-existing-concepts-in-the-literature-and-new-ones-in-relation-to-materializations-of-the-nop)
  - [Data typing](#data-typing)
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
  onNotification: (n: any) => console.log(n), //Using Notifications callback as a debugger
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
      left: {
        attribute: {
          fbe: "shooter1_name",
          attr: "gun.bullets",
        },
      },
      is: ">",
      right: {
        constant: 0,
      },
    },
    action: async (notifier: any, inferenceData: any) => { // Notifications from Conditions to Rules and Actions to Rules are accessible via inferenceData.
      console.log("loaded gun!!!");
      // get FBE Attribute value (using Notifications between Attributes and Actions).
      const bullets = await notifier.notifyAttrAndWaitReply({
        fbe: "shooter1_name",
        attr: "gun.bullets",
      });
      notifier.notifyFBE( // notify FBE
        "shooter1_name",
        "", //path
        {
          target: true,
        },
        "IGNORE_MISSING", //with "IGNORE_MISSING" mode, Attributes missing in "input" (in depth) will not be considered as excluded.
      );
      //Notifies a Rule to activate it (also depends on the Condition Notification of that Rule).
      notifier.notifyRule("rule2_name", { gun: "ok" });
    },
  },
);
```

For explicit Notification modes, if mode includes "IGNORE_MISSING", Attributes
missing in "input" (in depth) will not be considered as excluded, if mode
includes "FORCE" Notifications will be even if the values of these Notifications
are not modified (there is no change in the status of the notifiable entity),
and it is possible to combine the two modes ("IGNORE_MISSING_AND_FORCE"). FBEs
do not necessarily need to be instantiated. "IGNORE_MISSING" mode is only
applicable for Notifications to FBEs. Attributes are dynamically created when
referenced and do not need to be instantiated. If an FBE does not exist when
being notified by another entity of the NOP core, its instance is created
automatically. Note that the "." in Attributes is reserved in this
implementation for path notation, and this implementation handles circular
references. The "path" parameter in the notifications for FBEs optimizes
parallelization.

## Defining Conditions

Conditions are implemented in a tree structure, easy for humans to understand.
Conditions, Attributes values, and Notifications values ​​must be serializable
to JSON. Conditions don't necessarily need to notify boolean values. However,
these entities must notify a JavaScript `true` value for a Rule to activate it.
Values like `false`, `""`, `null`, `0` and `undefined` will be `false`. The fact
that Conditions notify each other with values ​​of any type allows the
construction of chain operations. If a notification triggers the evaluation of a
Condition and it has Attributes and SubConditions that never notified are
treated as if they had notified the value `undefined`. A Condition must have in
its tree at least one notifying entity (and not just constants). Conditions can
optionally accept parameters (such as fuzzy parameters[[2]](#2)) and custom
procedures like sum of a weighted input of a neuron[[3]](#3) or an activation
function like ReLU, and you can still combine it all at the same time. See
examples of Conditions:

```typescript
//------------------------- TYPES OF CONDITIONS ----------------------
//----------------WITH ONE ATTRIBUTE:
const c: Condition = {
  attribute: {
    fbe: "shooter1_name", //Fact Base Element name.
    attr: "target.person.age", //Attribute name - path notation
  },
};
//----------------WITH ONE CONSTANT:
const c: Condition = {
  constant: {
    name: "joe",
    age: 25,
  },
};
//---------------- CONDITION AS A PREMISE:
/*{
  left: Condition;
  is: string; //"==", ">", "<", etc.
  right: Condition;
}
*/
const c: Condition = {
  left: {
    attribute: {
      fbe: "shooter1_name",
      attr: "target.person.age",
    },
  },
  is: "==",
  right: {
    attribute: {
      fbe: "shooter2_name",
      attr: "target.person.age",
    },
  },
};
//---------------- CONDITION REFERENCING CONDITION FROM OTHER RULE:
const c: Condition = {
  ref: "rule2_name",
};
//----------------WITH OR, AND, XOR
const c: Condition = {
  and: [ //keys: "or", "and", "xor"
    //ARRAY of sub Conditions.
  ],
};
//----------------WITH CUSTOM PROCEDURE
const c: Condition = {
  op: "+", // "procedure name (registered extension) or operator (+, *, etc)",
  sub_conditions: [ //The notifications of this vector is the input parameter of the procedure. The return of the procedure is the exit notification.
    //ARRAY of sub Conditions.
  ],
};
//----------------WITH negation
const c: Condition = {
  not: c2, //c2 is one object of type Condition.
};
//----------------WITH OPTIONAL parameters (These parameters can be any type of Condition):
//----------------FOR FUZZY LOGIC:
const c: Condition = {
  // ... (Condition body) ...
  min_threshold: {
    constant: 0.2,
  },
  max_threshold: {
    constant: 0.8,
  },
};
const c: Condition = {
  // ... (Condition body) ...
  exactly: {
    constant: 0.5,
  },
};
```

All these types of Conditions listed are combinable with each other. However,
optional parameters (such as fuzzy parameters) should be used with caution,
observing their applicability.

### Condition with extensions

There is also an extension interface for named procedures, which are used as
customized operators in Conditions. These extensions are defined at the
beginning of the main thread by the "extensionsURLs" parameter, but they can
also be defined manually in the Rules file (in this case it must be before the
Rules declaration):

```typescript
DataMapChild.registerExtensions([customFunc2]);
```

How to use and create extensions:

```typescript
/*
Custom procedure template named "custonFunc2":
export default function custonFunc2(items: any[]): any {
  return true;
}

The Parameter "items" is the notifications of the entities inside the "sub_conditions" parameter.
The return will be the exit notification.

In Conditions:
*/
const c: Condition = {
  op: "customFunc2", //PROCEDURE NAME HERE, the "op" can also be operators like "+", "*", etc. Operators like "and" can be represented by their name in the language ("&&").
  sub_conditions: [ //"sub_conditions" only exists when the "op" attribute in a Condition is filled
    {
      left: {
        attribute: {
          fbe: "shooter1_name",
          attr: "gun.bullets",
        },
      },
      is: "==",
      right: {
        constant: 5,
      },
    },
  ],
};
```

### Combination of Conditions

A combination of different types of Conditions together is possible. Example
with simple logic, fuzzy logic and custom procedures:

```typescript
const c: Condition = {
  or: [
    { // 'or' condition 1
      not: {
        op: "ReLU", //custom procedure name
        sub_conditions: [
          {
            op: "sumOfWeights",
            sub_conditions: [
              { //Condition with only one Attribute. Attribute notification value is forwarded to Condition notification value
                attribute: {
                  fbe: "layer1_name",
                  attr: "neurons.0", //paths with .N is valid for vectors
                },
              },
            ],
          },
        ],
      },
    },
    { // 'or' condition 2
      attribute: {
        fbe: "shooter1_name",
        attr: "gun.distance",
      },
      min_threshold: {
        constant: 0.2,
      },
    },
    { // 'or' condition 3 (Condition as Premise)
      left: {
        op: "+", // op -> "procedure name or operator",
        sub_conditions: [
          { // op Condition 1
            attribute: {
              fbe: "shooter1_name",
              attr: "gun.distance",
            },
          },
          { // op Condition 2
            attribute: {
              fbe: "shooter1_name",
              attr: "gun.bullets",
            },
          },
        ],
      },
      is: "==",
      right: {
        constant: 105.6,
      },
    },
  ],
};
```

In the application library, there is an extension procedure named "deepEqual",
which checks in depth if two objects are the same, i.e. compares their
parameters, subparameters and etc.

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
deno run --unstable --allow-all example/main.ts
# run project example (web):
deno run --allow-all --unstable https://raw.githubusercontent.com/hviana/scriptNOP/master/example/main.ts
# bundle scriptNOP lib to any runtime or web browsers:
deno bundle mod.ts nop.js
# bundle scriptNOP lib to any runtime or web browsers (web):
deno bundle https://raw.githubusercontent.com/hviana/scriptNOP/master/mod.ts nop.js
```

## Particularities of this implementation

The framework has several facilities for the developer. Conditions can be
composed of SubConditions and can have parameters such as fuzzy parameters.
Actions have a paradigm-independent nature and are represented directly by a
reference to a procedure. This Action procedure can directly notify values to
FBEs in order to make changes to the fact base, and notify and receive
Notifications from Attributes in order to read the fact base.

To support all these features, the core of the original NOP was modified.
Basically, the Instigations and Methods entities were removed, and several new
Notification paths were added. The Instigations and Methods were removed to make
way for a paradigm-independent Action procedure.

In this implementation, Conditions are a broadly generic entity that not only
uses logical operators over Premises, but can also notify non-boolean values and
non-boolean operations between values. The Premise concept still exists, but its
structure was unified with the Condition, and it is possible to parameterize a
Condition to act as a Premise, being that this structure unification promotes
simplicity in framework code. In this implementation this makes sense because,
the left and/or right side of a Premise is a Condition, increasing algorithmic
flexibility of the Premises. For the composition between Conditions,
Notifications from Conditions to Conditions were created. Notifications of
Attributes for Conditions were created, and it is possible for example that the
Notification value of a Condition is directly the Notification value of an
Attribute

Actions, since they are a direct reference to a paradigm-independent procedure,
need a drastic amount of modifications. When using imperative programming
mechanisms, for example, it is unpredictable to know what the code execution
flow will be since there may be, for example, code suspension mechanisms such as
an `IF`, making it impossible to predict which Notifications will be sent and
received by this Action procedure. To solve this problem, this Action procedure
has access to routines that explicitly notify and receive Notifications. When
needing an Attribute, there is an asynchronous routine named
`notifyAttrAndWaitReply` that sends a Notification to the respective Attribute
that symbolizes a request to its current value, and the Attribute sends to the
Action procedure a Notification with its current value that is captured by the
routine `notifyAttrAndWaitReply`. In the end, the `notifyAttrAndWaitReply`
routine returns the current value of the Attribute inside the Action procedure.
To notify FBEs, there is also a routine named `notifyFBE`, which transmits to an
FBE a Notification containing a set of new values ​​for that FBE. It is also
possible to send an explicit Notification to other Rules to activate them by a
routine named `notifyRule`, also considering the Notifications of their
respective Conditions.

The change of state of a notifying entity is always verified by its exit
Notification value. In this way, Notifications from Rules to Actions, Actions to
Attributes and from Attributes to Actions always use the "FORCE" mode, since the
value of the Notification does not matter and only the fact that it exists
represents a change of state

The Action procedure open a gap for possible temporal and structural
redundancies in relation to the original NOP core, however, allows a very great
ease for the programmer. It is possible, for example, to use native language
resources such as the `setTimeout` procedure to delay the execution of the
Action procedure and implement a basic priority resource.

FBEs notify attributes in depth. That is, if an Attribute `A2` is inside the
Attribute `A1` (i.e. `A1.A2`), Notifications about `A2` will trigger
Notifications about `A1`. If an Attribute is replaced by an entirely new
Attribute (or created), its SubAttributes are also notified. It is possible to
visualize the behavior in Code 1.

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
Conditions/Premises that use "a", "a.b", "a.b.c", "e" and "e.f" will be notified.
Conditions/Premises that use only "a.d" are not notified, since
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
    e: {
      f: 1,
    },
  },
);
fbe.get("a.b"); //returns "a.b" Attribute.
```

<p align="center">
  <strong> Code 1. Depth reactivity.</strong>
</p>

A better view of the inference flow driven by Notifications can be seen in
Figure 2 compared to the original NOP core in Figure 1.

<p align="center">
  <img src="https://raw.githubusercontent.com/hviana/scriptNOP/master/docs/nop-entities.svg" width="600">
</p>

<p align="center">
  <strong>Figure 1. Flow of Notifications in the original NOP core.</strong>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/hviana/scriptNOP/master/docs/script-nop.svg" width="600">
</p>

<p align="center">
  <strong>Figure 2. Flow of Notifications in the scriptNOP core.</strong>
</p>

The framework also has a debugger procedure that intercepts all Notifications
between NOP core entities. In this way, it is possible, for example, to save
this information in a history or print it on the screen, in addition to allowing
the implementation of explainability mechanisms.

### Multithreaded and concurrent approach used

The multithreaded approach used has an asynchronous nature that eliminates the
need for synchronization mechanisms between threads and control mechanisms such
as mutexes, reducing the CPU overhead in parallelization. However, the approach
cannot evenly distribute the load and tends to overload the main thread.

In this approach, there is a main thread named "state manager", which contains
the entire base of facts (FBEs and Attributes) together with a global map
containing the Notification between all entities, representing application
memory. There are also N secondary threads, where each of these secondary
threads contains the same set of all other entities like Conditions, Rules and
Actions, representing the executable part of the application. The main thread,
when receiving a Notification from any entity, checks if it causes a
Notification map change given the value of the Notification, and if so, sends to
one of the secondary threads an evaluation request for the recipient of this
Notification, sending together all the other Notifications that were intended
for that recipient (with the exception of FBEs and Attributes that have their
state evaluated in the main thread). At the end of the evaluation, the secondary
thread sends the exit Notification of the evaluated entity to the main thread,
repeating the cycle.

The concept of concurrent programming is also explored. Operations in Conditions
and Action procedures use asynchronous functions performed concurrently. In this
way, if they use normally blocking operations such as I/O operations and HTTP
requests, the thread is not blocked and is not idle.

The fact that the main thread intercepts all Notifications facilitates the
implementation of mechanisms that use these Notifications to create debugger,
history and explainability mechanisms.

### Comparison of existing concepts in the literature and new ones in relation to materializations of the NOP

Many of the concepts used in this materialization of NOP are not new and already
existed in old materializations. In Table 1 it is possible to visualize a list
of these concepts and which ones are implemented [[4]](#4).

<p align="center">

| Concept                               | Description                                                                                                                                                                                                                                                                                                                                                                     | Implements |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Reactivity of entities                | Entities are able to generate punctual Notifications spontaneously in the state change.                                                                                                                                                                                                                                                                                         | YES        |
| ReNotifications                       | Entities can forcibly generate Notifications, even without change in your states.                                                                                                                                                                                                                                                                                               | YES        |
| Keeper                                | Manual control of the execution of Rules, allowing the execution of a Rule multiple times while approved.                                                                                                                                                                                                                                                                       | Partially  |
| Impertinence                          | Selective suppression of Notifications from certain entities, which may occurstatically or dynamically.                                                                                                                                                                                                                                                                         | NO         |
| Entity sharing                        | Shared use of entities with common knowledge with other entities, reducing the number of unique entities in the system.                                                                                                                                                                                                                                                         | YES        |
| Master Rule                           | Relation of dependency between Rules with logical-causal knowledge in common.                                                                                                                                                                                                                                                                                                   | YES        |
| Formation Rules                       | Creation of Rules based on the generic representation of a Rule relative to the type of FBEs.                                                                                                                                                                                                                                                                                   | NO         |
| FBE Rules                             | Defining Rules in the FBE body, instantiating a standalone Rule for each instance of FBE data.                                                                                                                                                                                                                                                                                  | NO         |
| Aggregation between FBEs              | Creating FBEs composed of other FBEs.                                                                                                                                                                                                                                                                                                                                           | Partially  |
| Composition of Conditions             | Conditions can have subConditions allowing broadly generic composition.                                                                                                                                                                                                                                                                                                         | YES        |
| Lambda expressions                    | Anonymous functions used as operators in Premises and Conditions.                                                                                                                                                                                                                                                                                                               | NO         |
| Priority between Rules                | Rules can have priorities that change the order of their activations.                                                                                                                                                                                                                                                                                                           | Partially  |
| Algorithmic flexibility in Conditions | Conditions Composition lets you create Conditions with something like: ((a > 1) AND ((b > 2) OR NOT(c > 3)))                                                                                                                                                                                                                                                                    | YES        |
| Parallelism                           | Application processing takes place on multiple CPUs.                                                                                                                                                                                                                                                                                                                            | YES        |
| **Concurrent**                        | Use of asynchronous functions to evaluate the state of entities, optimizing the use of processing cores.                                                                                                                                                                                                                                                                        | YES        |
| **Depth reactivity**                  | Changing an attribute can change its sub and super attributes, triggering in-depth Notifications.                                                                                                                                                                                                                                                                               | YES        |
| **Notifications callback**            | Mechanism that intercepts all Notifications, allowing to keep a history or use a debugger, also allowing the construction of mechanisms of explicability.                                                                                                                                                                                                                       | YES        |
| **Custom procedures**                 | Custom procedures used as operators in Premises and Conditions, it differs from the lambda expression by using a named procedure that can be reused using the name as a reference. Retains the same algorithmic flexibility promoted by lambda expressions.                                                                                                                     | YES        |
| **Complex Premises**                  | Allows the left or right side of a Premise to be the result of an operation between values ​​and/or Attributes instead of just an Attribute, Increasing algorithmic flexibility.                                                                                                                                                                                                | YES        |
| **Action procedure**                  | Action represented by a paradigm-independent procedure with routines capable of explicitly notifying and receiving Notifications.                                                                                                                                                                                                                                               | YES        |
| **Strict inference by Notifications** | Only Notifications can change the inference order. This does not allow for example the manual activation of Rules with Keeper.                                                                                                                                                                                                                                                  | YES        |
| **Generic Notification**              | Allows Notifications with generic values ​​that can be interpreted as `true` or `false`. There are languages ​​that do an automatic "cast" of several types ​​to boolean, and it is also possible to do this conversion in the last operation of the chain. Allows an inference triggered by these Notifications use these Notification values ​​for building chain operations. | YES        |
| **Generic Conditions**                | Conditions are a broadly generic entity that not only uses logical operators over Premises, but can also notify non-boolean values ​​and non-boolean operations between values. It is the result of exploring the concept of Generic Notification.                                                                                                                              | YES        |
| **Indexed Premises and Conditions**   | If two Premises or Conditions of different instances have the same content, they are internally unified and referenced by the same index, avoiding temporal redundancies.                                                                                                                                                                                                       | YES        |
| **Strongly typed interface**          | The programmer interface is strongly typed avoiding coding errors.                                                                                                                                                                                                                                                                                                              | YES        |
| **Interface with structured data**    | Attributes, Premises and Conditions can be represented in a structured data format such as JSON and XML that is interpreted by the application.                                                                                                                                                                                                                                 | YES        |

</p>

<p align="center">
<strong>

Table 1. NOP concepts applied in materializations [[4]](#4). The concepts in
bold were introduced in this materialization.</strong>

</p>

### Data typing

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
// ...
export interface ConditionWithAttribute {
  attribute: Attribute;
}
export interface ConditionAsPremise {
  left: Condition;
  is: string;
  right: Condition;
}
// ...
export interface ConditionWithXor {
  xor: [Condition, Condition, ...Condition[]]; //min 2 Conditions
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
//...
export class Rule {
  static coreLoaded: boolean = false;
  static initialized: boolean = false;
  #conditionTranspiler: ConditionTranspiler;
```

Defining Attributes, Premises and Conditions using data types in JSON notation
promotes a reduction in excess verbosity and promotes a more abstracted
interface.

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

<a id="4">[4]</a> F. S. Neves, R. B. Linhares, "Framework NOP 4.0: contribution
to the development of applications in the notification oriented paradigm through
generic programming" (2021). Institutional Repository of the Federal
Technological University of Paraná. url:
https://repositorio.utfpr.edu.br/jspui/handle/1/26270

## About

Author: Henrique Emanoel Viana, a Brazilian computer scientist, enthusiast of
web technologies, cel: +55 (41) 99999-4664. URL:
https://sites.google.com/view/henriqueviana

Improvements and suggestions are welcome!
