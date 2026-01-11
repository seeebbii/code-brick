import * as p from "@clack/prompts";
import pc from "picocolors";
import fs from "fs-extra";
import path from "path";
import {
    isInitialized,
  getTemplatePath,
  getTemplate,
  loadTemplateMetadata,
  saveTemplateMetadata,
  addTemplateToStore,
  LocalTemplate,
    resolveTemplateName,
} from "../lib/storage.js";

export async function removeFileCommand(
    nameOrIndex: string,
  filePatterns: string[]
): Promise<void> {
  p.intro(pc.cyan("🧱 Removing files from template"));

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

  // Only allow removing from local templates
  if (template.type === "remote") {
    p.log.error(
      "Cannot remove files from remote templates. Use " +
        pc.cyan(`brick pull ${name}`) +
        " to convert to local first."
    );
    process.exit(1);
  }

  // Load metadata
  const metadata = await loadTemplateMetadata(name);

  if (!metadata) {
    p.log.error("Failed to load template metadata");
    process.exit(1);
  }

  // Find matching files
  const filesToRemove: string[] = [];
  const templatePath = getTemplatePath(name);

  for (const pattern of filePatterns) {
    // Check if it's an exact match
    if (metadata.files.includes(pattern)) {
      filesToRemove.push(pattern);
      continue;
    }

    // Check if it matches a directory
    const dirPattern = pattern.endsWith("/") ? pattern : pattern + "/";
    const matchingFiles = metadata.files.filter(
      (f) => f === pattern || f.startsWith(dirPattern)
    );

    if (matchingFiles.length > 0) {
      filesToRemove.push(...matchingFiles);
      continue;
    }

    // Try simple glob matching
    const regexPattern = pattern
      .replace(/\./g, "\\.")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");
    const regex = new RegExp(`^${regexPattern}$`);
    const matches = metadata.files.filter((f) => regex.test(f));
    filesToRemove.push(...matches);
  }

  // Remove duplicates
  const uniqueFilesToRemove = [...new Set(filesToRemove)];

  if (uniqueFilesToRemove.length === 0) {
    p.log.error("No matching files found in template");
    p.log.info(`Template files: ${metadata.files.join(", ")}`);
    process.exit(1);
  }

  // Show files to remove
  console.log();
  console.log(pc.bold(`  Files to remove:`));
  for (const file of uniqueFilesToRemove.slice(0, 10)) {
    console.log(`    ${pc.red("-")} ${file}`);
  }
  if (uniqueFilesToRemove.length > 10) {
    console.log(pc.dim(`    ... and ${uniqueFilesToRemove.length - 10} more`));
  }
  console.log();

  // Confirm
  const confirmed = await p.confirm({
    message: `Confirm removing ${uniqueFilesToRemove.length} file(s)?`,
    initialValue: true,
  });

  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel("Operation cancelled");
    process.exit(0);
  }

  // Remove files
  const spinner = p.spinner();
  spinner.start("Removing files...");

  let removedCount = 0;

  for (const file of uniqueFilesToRemove) {
    const filePath = path.join(templatePath, file);

    // Remove file
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
    }

    // Remove from metadata
    const index = metadata.files.indexOf(file);
    if (index > -1) {
      metadata.files.splice(index, 1);
    }

    removedCount++;
  }

  // Clean up empty directories
  const cleanEmptyDirs = async (dir: string) => {
    const entries = await fs.readdir(dir);
    for (const entry of entries) {
      const entryPath = path.join(dir, entry);
      const stat = await fs.stat(entryPath);
      if (stat.isDirectory()) {
        await cleanEmptyDirs(entryPath);
        // Check if now empty
        const subEntries = await fs.readdir(entryPath);
        if (subEntries.length === 0) {
          await fs.remove(entryPath);
        }
      }
    }
  };

  await cleanEmptyDirs(templatePath);

  // Update metadata
  metadata.updatedAt = new Date().toISOString();
  await saveTemplateMetadata(name, metadata);

  // Update store
  const updatedTemplate: LocalTemplate = {
    ...template,
    updatedAt: metadata.updatedAt,
  };
  await addTemplateToStore(name, updatedTemplate);

  spinner.stop(`Removed ${removedCount} file(s)`);

  console.log();
  console.log(
    `  Template now has ${pc.green(metadata.files.length.toString())} files remaining`
  );
  console.log();

  p.outro("Template updated! ✓");
}
