const fs = require("fs-extra");

function init(args) {
  // creating the folder structure - io
  if (args.output) {
    if (fs.existsSync(args.output)) {
      if (fs.readdirSync(args.output).length > 0) {
        if (args.overwrite) {
          fs.emptyDirSync(args.output);
        } else {
          throw new Error("Error: Output folder or file " +
              args.output +
              " is not empty. Delete/empty manually or call with --overwrite.");
        }
      }
    } else {
      fs.mkdirSync(args.output);
    }
  }
}

module.exports = { init };
