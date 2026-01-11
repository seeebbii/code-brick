import * as p from "@clack/prompts";
import pc from "picocolors";
import {
    isInitialized,
  getTemplatePath,
  getTemplate,
    resolveTemplateName,
} from "../lib/storage.js";
import {
  buildTree,
  renderTree,
  getDirectoryStats,
  formatSize,
} from "../lib/utils.js";

interface TreeOptions {
  size?: boolean;
  preview?: boolean;
}

export async function treeCommand(
    nameOrIndex: string,
  options: TreeOptions
): Promise<void> {
  // Check if initialized
  if (!(await isInitialized())) {
    p.log.error(
      "CodeBrick is not initialized. Run " + pc.cyan("brick init") + " first."
    );
    process.exit(1);
  }

    // Resolve template name from index or name
    const name = await resolveTemplateName(nameOrIndex);
    if (!name) {
    p.log.error(
        `Template '${nameOrIndex}' not found. Run ${pc.cyan("brick list")} to see available templates.`
    );
    process.exit(1);
  }

  const template = await getTemplate(name);

  if (!template) {
    p.log.error(`Template '${name}' not found.`);
    process.exit(1);
  }

  // For remote templates, show a message
  if (template.type === "remote") {
    console.log();
    console.log(pc.bold(pc.blue(name)) + pc.dim(" (remote)"));
    console.log(
      pc.dim(
        `Source: github:${template.github.owner}/${template.github.repo}/${template.github.path}`
      )
    );
    console.log();
    console.log(
      pc.yellow(
        "Remote template files are fetched on-demand. Use " +
          pc.cyan(`brick pull ${name}`) +
          " to download locally."
      )
    );
    console.log();
    return;
  }

  // Local template - show tree
  const templatePath = getTemplatePath(name);
  const tree = await buildTree(templatePath, options.size);
  const stats = await getDirectoryStats(templatePath);

  console.log();

  // Header with size if requested
  if (options.size) {
    console.log(pc.bold(pc.green(name)) + pc.dim(` (${formatSize(stats.totalSize)})`));
  } else {
    console.log(pc.bold(pc.green(name)));
  }

  // Render tree
  const treeOutput = renderTree(tree, "", true, options.size);
  console.log(treeOutput);

  // Summary
  const summary = [];
  if (stats.files > 0) {
    summary.push(`${stats.files} file${stats.files === 1 ? "" : "s"}`);
  }
  if (stats.directories > 0) {
    summary.push(`${stats.directories} director${stats.directories === 1 ? "y" : "ies"}`);
  }
  if (options.size && stats.totalSize > 0) {
    summary.push(`${formatSize(stats.totalSize)} total`);
  }

  console.log(pc.dim(summary.join(", ")));
  console.log();
}
