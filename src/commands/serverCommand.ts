import server from "../server/server.js";

export default {
  command: "serve",
  desc: "Start in server mode and connect using a web browser",
  builder: (yargs) =>
    yargs
      .alias("p", "port")
      .default("p", 8080)
      .describe(
        "browser-options",
        "Arguments passed over to the browser (Chrome)",
      )
      .nargs("browser-options", 1)
      .array("browser-options")
      .default("browser-options", []),
  handler: async (args) => await server(args.port, args.browserOptions),
};
