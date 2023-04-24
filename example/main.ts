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
