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
