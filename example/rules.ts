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
