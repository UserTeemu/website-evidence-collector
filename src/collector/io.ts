import fs from "fs-extra";

export function createOutputDirectory(
  output_path: undefined | string,
  overwrite: boolean,
): void {
  if (!output_path) {
    return;
  }

  if (!fs.existsSync(output_path)) {
    fs.mkdirSync(output_path);
  }

  if (fs.readdirSync(output_path).length > 0) {
    if (overwrite) {
      fs.emptyDirSync(output_path);
    } else {
      throw new Error(
        `Error: Output folder or file ${output_path} is not empty.        
  Delete/empty manually or call with --overwrite.`,
      );
    }
  }
}
