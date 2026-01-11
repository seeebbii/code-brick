import * as p from "@clack/prompts";
import pc from "picocolors";
import {
    isInitialized,
  getTemplate,
  getTemplatePath,
  loadTemplateMetadata,
    resolveTemplateName,
} from "../lib/storage.js";
import { formatDate, createBox, getDirectoryStats } from "../lib/utils.js";

export async function infoCommand(nameOrIndex: string): Promise<void> {
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

  console.log();

  if (template.type === "local") {
    // Local template info
    const metadata = await loadTemplateMetadata(name);
    const templatePath = getTemplatePath(name);
    const stats = await getDirectoryStats(templatePath);

    const content: string[] = [
      "",
      `Description:  ${metadata?.description || pc.dim("No description")}`,
      `Version:      ${metadata?.version || "1.0.0"}`,
      `Created:      ${formatDate(template.createdAt)}`,
      `Updated:      ${formatDate(template.updatedAt)}`,
      "",
      `Source:       ${metadata?.source?.path || pc.dim("Unknown")}`,
      `Storage:      ${pc.dim(`~/.codebrick/templates/${name}`)}`,
      "",
    ];

    if (template.tags.length > 0) {
      content.push(`Tags:         ${template.tags.join(", ")}`);
      content.push("");
    }

    content.push(
      `Files:        ${stats.files} file${stats.files === 1 ? "" : "s"}` +
        (stats.directories > 0
          ? `, ${stats.directories} director${stats.directories === 1 ? "y" : "ies"}`
          : "")
    );
    content.push("");

    // Dependencies
    if (metadata?.dependencies && Object.keys(metadata.dependencies).length > 0) {
      content.push("Dependencies:");
      for (const [dep, version] of Object.entries(metadata.dependencies)) {
        content.push(`  ${dep.padEnd(20)} ${pc.dim(version as string)}`);
      }
      content.push("");
    }

    // Dev dependencies
    if (
      metadata?.devDependencies &&
      Object.keys(metadata.devDependencies).length > 0
    ) {
      content.push("Dev Dependencies:");
      for (const [dep, version] of Object.entries(metadata.devDependencies)) {
        content.push(`  ${dep.padEnd(20)} ${pc.dim(version as string)}`);
      }
      content.push("");
    }

    const title = pc.bold(pc.green(name));
    console.log(createBox(title, content, 60));
  } else {
    // Remote template info
    const github = template.github;
    const source = `github:${github.owner}/${github.repo}/${github.path}`;
    const ref = github.commit
      ? `${github.ref} @ ${github.commit.slice(0, 7)}`
      : github.ref;

    const content: string[] = [
      "",
      `Description:  ${template.description || pc.dim("No description")}`,
      `Linked:       ${formatDate(template.createdAt)}`,
      "",
      `Source:       ${source}`,
      `Ref:          ${ref}`,
      "",
    ];

    if (template.tags.length > 0) {
      content.push(`Tags:         ${template.tags.join(", ")}`);
      content.push("");
    }

    content.push(pc.yellow("This is a remote template."));
    content.push(pc.yellow("Files are fetched from GitHub on-demand."));
    content.push("");

    const title = pc.bold(pc.blue(name)) + pc.dim(" (remote)");
    console.log(createBox(title, content, 60));
  }

  // Commands
  console.log();
  console.log(pc.bold("Commands:"));
  console.log(`  ${pc.cyan(`brick tree ${name}`)}     View file structure`);
  console.log(`  ${pc.cyan(`brick apply ${name}`)}    Apply to project`);

  if (template.type === "local") {
    console.log(`  ${pc.cyan(`brick add ${name}`)}      Add files to template`);
  } else {
    console.log(`  ${pc.cyan(`brick pull ${name}`)}     Download locally`);
  }

  console.log();
}
