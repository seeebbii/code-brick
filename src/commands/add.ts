import * as p from "@clack/prompts";
import pc from "picocolors";
import fs from "fs-extra";
import path from "path";
import fg from "fast-glob";
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

export async function addCommand(
    nameOrIndex: string,
  filePatterns: string[]
): Promise<void> {
  p.intro(pc.cyan("🧱 Adding files to template"));

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

  // Only allow adding to local templates
  if (template.type === "remote") {
    p.log.error(
      "Cannot add files to remote templates. Use " +
        pc.cyan(`brick pull ${name}`) +
        " to convert to local first."
    );
    process.exit(1);
  }

  // Resolve file patterns
  const cwd = process.cwd();
  const filesToAdd: { source: string; relative: string }[] = [];

  for (const pattern of filePatterns) {
    const resolved = path.resolve(pattern);

    // Check if it's a direct file/directory path
    if (await fs.pathExists(resolved)) {
      const stat = await fs.stat(resolved);

      if (stat.isDirectory()) {
        // Add all files in directory
        const files = await fg("**/*", {
          cwd: resolved,
          dot: false,
          onlyFiles: true,
        });

          // Compute relative path from cwd to preserve folder structure
          // e.g., ./ios/Runner → ios/Runner (not just Runner)
          const relativeDirPath = path.relative(cwd, resolved);
          const basePath = relativeDirPath.startsWith('..')
              ? path.basename(resolved) // Outside cwd, use just the folder name
              : relativeDirPath;        // Inside cwd, preserve full relative path

        for (const file of files) {
          filesToAdd.push({
            source: path.join(resolved, file),
              relative: path.join(basePath, file),
          });
        }
      } else {
          // Single file - preserve relative path from cwd
          const relativeFilePath = path.relative(cwd, resolved);
        filesToAdd.push({
          source: resolved,
            relative: relativeFilePath.startsWith('..')
                ? path.basename(resolved)  // Outside cwd, use just filename
                : relativeFilePath,         // Inside cwd, preserve path
        });
      }
    } else {
      // Try as glob pattern
      const matches = await fg(pattern, {
        cwd,
        dot: false,
        onlyFiles: true,
      });

      for (const match of matches) {
        filesToAdd.push({
          source: path.join(cwd, match),
          relative: match,
        });
      }
    }
  }

  if (filesToAdd.length === 0) {
    p.log.error("No files found matching the specified patterns");
    process.exit(1);
  }

  // Show files to add
  console.log();
  console.log(pc.bold(`  Files to add:`));
  for (const file of filesToAdd.slice(0, 10)) {
    console.log(`    ${pc.green("+")} ${file.relative}`);
  }
  if (filesToAdd.length > 10) {
    console.log(pc.dim(`    ... and ${filesToAdd.length - 10} more`));
  }
  console.log();

  // Confirm
  const confirmed = await p.confirm({
    message: `Confirm adding ${filesToAdd.length} file(s)?`,
    initialValue: true,
  });

  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel("Operation cancelled");
    process.exit(0);
  }

  // Copy files to template
  const spinner = p.spinner();
  spinner.start("Adding files...");

  const templatePath = getTemplatePath(name);
  const metadata = await loadTemplateMetadata(name);

  if (!metadata) {
    spinner.stop("Failed to load template metadata");
    process.exit(1);
  }

  const existingFiles = new Set(metadata.files);
  let addedCount = 0;

  for (const file of filesToAdd) {
    const destPath = path.join(templatePath, file.relative);

    // Ensure directory exists
    await fs.ensureDir(path.dirname(destPath));

    // Copy file
    await fs.copy(file.source, destPath, { overwrite: true });

    // Add to metadata if not already present
    if (!existingFiles.has(file.relative)) {
      metadata.files.push(file.relative);
      existingFiles.add(file.relative);
    }

    addedCount++;
  }

  // Update metadata
  metadata.updatedAt = new Date().toISOString();
  await saveTemplateMetadata(name, metadata);

  // Update store
  const updatedTemplate: LocalTemplate = {
    ...template,
    updatedAt: metadata.updatedAt,
  };
  await addTemplateToStore(name, updatedTemplate);

  spinner.stop(`Added ${addedCount} file(s)`);

  console.log();
  console.log(
    `  Template now has ${pc.green(metadata.files.length.toString())} files`
  );
  console.log();

  p.outro("Template updated! ✓");
}
