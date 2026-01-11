import * as p from "@clack/prompts";
import pc from "picocolors";
import {
    isInitialized,
  getTemplate,
  removeTemplateFromStore,
  deleteTemplateFiles,
  loadTemplateMetadata,
    resolveTemplateName,
} from "../lib/storage.js";

interface DeleteOptions {
  force?: boolean;
}

export async function deleteCommand(
    nameOrIndex: string,
  options: DeleteOptions
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

  // Get file count for local templates
  let fileCount = 0;
  if (template.type === "local") {
    const metadata = await loadTemplateMetadata(name);
    fileCount = metadata?.files.length || 0;
  }

  // Confirm deletion
  if (!options.force) {
    console.log();
    console.log(pc.yellow(`  Delete template '${name}'?`));
    console.log();
    console.log("  This will permanently remove:");
    if (template.type === "local") {
      console.log(`    - ${fileCount} file${fileCount === 1 ? "" : "s"}`);
    }
    console.log("    - All metadata");
    console.log();

    const confirmName = await p.text({
      message: `Type '${name}' to confirm:`,
      placeholder: name,
      validate: (value) => {
        if (value !== name) {
          return `Please type '${name}' to confirm deletion`;
        }
      },
    });

    if (p.isCancel(confirmName)) {
      p.cancel("Operation cancelled");
      process.exit(0);
    }
  }

  // Delete template
  const spinner = p.spinner();
  spinner.start("Deleting template...");

  try {
    // Delete files for local templates
    if (template.type === "local") {
      await deleteTemplateFiles(name);
    }

    // Remove from store
    await removeTemplateFromStore(name);

    spinner.stop("Template deleted");

    console.log();
    p.outro(`Template '${pc.red(name)}' has been deleted`);
  } catch (error) {
    spinner.stop("Failed to delete template");
    p.log.error(
      error instanceof Error ? error.message : "Unknown error occurred"
    );
    process.exit(1);
  }
}
