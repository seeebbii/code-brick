import * as p from "@clack/prompts";
import pc from "picocolors";
import fs from "fs-extra";
import path from "path";
import {
    isInitialized,
  getTemplatePath,
  getTemplate,
  loadTemplateMetadata,
    resolveTemplateName,
} from "../lib/storage.js";
import { detectPackageManager } from "../lib/utils.js";

interface ApplyOptions {
  force?: boolean;
  skipExisting?: boolean;
  dryRun?: boolean;
  latest?: boolean;
  deps?: boolean;
}

export async function applyCommand(
    nameOrIndex: string,
  destination: string | undefined,
  options: ApplyOptions
): Promise<void> {
  p.intro(pc.cyan("🧱 Applying template"));

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

  // Handle remote templates
  if (template.type === "remote") {
    p.log.error(
      "Remote template support coming soon. Use " +
        pc.cyan(`brick pull ${name}`) +
        " to download locally first."
    );
    process.exit(1);
  }

  // Resolve destination
  const destPath = destination ? path.resolve(destination) : process.cwd();

  // Load template metadata
  const metadata = await loadTemplateMetadata(name);
  if (!metadata) {
    p.log.error("Failed to load template metadata");
    process.exit(1);
  }

  p.log.info(`Destination: ${pc.dim(destPath)}`);

  // Check for conflicts
  const templatePath = getTemplatePath(name);
  const conflicts: string[] = [];
  const filesToCopy: string[] = [];

  for (const file of metadata.files) {
    const destFile = path.join(destPath, file);
    if (await fs.pathExists(destFile)) {
      conflicts.push(file);
    }
    filesToCopy.push(file);
  }

  // Show files to be created
  console.log();
  console.log(pc.bold(`  ${filesToCopy.length} files will be created:`));
  for (const file of filesToCopy.slice(0, 10)) {
    const isConflict = conflicts.includes(file);
    const prefix = isConflict ? pc.yellow("~") : pc.green("+");
    console.log(`    ${prefix} ${file}`);
  }
  if (filesToCopy.length > 10) {
    console.log(pc.dim(`    ... and ${filesToCopy.length - 10} more`));
  }
  console.log();

  // Handle conflicts
  if (conflicts.length > 0 && !options.force && !options.skipExisting) {
    console.log(pc.yellow(`  ⚠ ${conflicts.length} file(s) already exist:`));
    for (const file of conflicts.slice(0, 5)) {
      console.log(pc.dim(`    - ${file}`));
    }
    if (conflicts.length > 5) {
      console.log(pc.dim(`    ... and ${conflicts.length - 5} more`));
    }
    console.log();

    const conflictAction = await p.select({
      message: "How would you like to handle existing files?",
      options: [
        { value: "overwrite", label: "Overwrite all" },
        { value: "skip", label: "Skip existing files" },
        { value: "cancel", label: "Cancel" },
      ],
    });

    if (p.isCancel(conflictAction) || conflictAction === "cancel") {
      p.cancel("Operation cancelled");
      process.exit(0);
    }

    if (conflictAction === "skip") {
      options.skipExisting = true;
    } else {
      options.force = true;
    }
  }

  // Handle dependencies
  const hasDeps =
    metadata.dependencies && Object.keys(metadata.dependencies).length > 0;
  const hasDevDeps =
    metadata.devDependencies &&
    Object.keys(metadata.devDependencies).length > 0;

  if ((hasDeps || hasDevDeps) && options.deps !== false) {
    const allDeps = {
      ...metadata.dependencies,
      ...metadata.devDependencies,
    };

    console.log(pc.bold("  Dependencies required:"));
    for (const [dep, version] of Object.entries(allDeps)) {
      console.log(`    ${pc.cyan(dep)} ${pc.dim(version as string)}`);
    }
    console.log();

    const versionChoice = await p.select({
      message: "How would you like to handle dependency versions?",
      options: [
        { value: "template", label: "Use template versions (recommended)" },
        { value: "latest", label: "Use @latest for all packages" },
        { value: "skip", label: "Skip dependency installation" },
      ],
    });

    if (p.isCancel(versionChoice)) {
      p.cancel("Operation cancelled");
      process.exit(0);
    }

    if (versionChoice === "latest") {
      options.latest = true;
    }
  }

  // Dry run - just show what would happen
  if (options.dryRun) {
    console.log(pc.yellow("  Dry run - no files will be written"));
    console.log();
    p.outro("Dry run complete");
    return;
  }

  // Confirm
  const confirmed = await p.confirm({
    message: "Proceed with installation?",
    initialValue: true,
  });

  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel("Operation cancelled");
    process.exit(0);
  }

  // Copy files
  const spinner = p.spinner();
  spinner.start("Creating files...");

  let copiedCount = 0;
  let skippedCount = 0;

  for (const file of metadata.files) {
    const sourceFile = path.join(templatePath, file);
    const destFile = path.join(destPath, file);

    // Check if should skip
    if (options.skipExisting && (await fs.pathExists(destFile))) {
      skippedCount++;
      continue;
    }

    // Ensure directory exists
    await fs.ensureDir(path.dirname(destFile));

    // Copy file
    await fs.copy(sourceFile, destFile, { overwrite: options.force });
    copiedCount++;
  }

  spinner.stop("Files created!");

  // Summary
  console.log();
  console.log(pc.green(`  ✓ ${copiedCount} file(s) created`));
  if (skippedCount > 0) {
    console.log(pc.yellow(`  ⊘ ${skippedCount} file(s) skipped`));
  }

  // Show dependency install command if applicable
  if ((hasDeps || hasDevDeps) && options.deps !== false) {
    const pm = await detectPackageManager(destPath);
    const installCmd = pm === "yarn" ? "yarn add" : pm === "pnpm" ? "pnpm add" : pm === "bun" ? "bun add" : "npm install";

    console.log();
    console.log(pc.dim("  To install dependencies, run:"));

    const deps = Object.entries(metadata.dependencies || {}).map(
      ([dep, version]) => (options.latest ? dep : `${dep}@${version}`)
    );
    const devDeps = Object.entries(metadata.devDependencies || {}).map(
      ([dep, version]) => (options.latest ? dep : `${dep}@${version}`)
    );

    if (deps.length > 0) {
      console.log(`    ${pc.cyan(installCmd)} ${deps.join(" ")}`);
    }
    if (devDeps.length > 0) {
      const devFlag = pm === "yarn" ? "--dev" : pm === "bun" ? "--dev" : "-D";
      console.log(`    ${pc.cyan(installCmd)} ${devFlag} ${devDeps.join(" ")}`);
    }
  }

  console.log();
  p.outro("Template applied successfully! 🎉");
}
