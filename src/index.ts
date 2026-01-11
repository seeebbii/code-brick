#!/usr/bin/env node

import { Command } from "commander";
import pc from "picocolors";
import { initCommand } from "./commands/init.js";
import { saveCommand } from "./commands/save.js";
import { listCommand } from "./commands/list.js";
import { treeCommand } from "./commands/tree.js";
import { applyCommand } from "./commands/apply.js";
import { infoCommand } from "./commands/info.js";
import { addCommand } from "./commands/add.js";
import { removeFileCommand } from "./commands/remove-file.js";
import { deleteCommand } from "./commands/delete.js";
import { sizeCommand } from "./commands/size.js";

const program = new Command();

program
    .name("brick")
    .description(
        pc.cyan("🧱 CodeBrick") +
        " - A framework-agnostic CLI for managing reusable code templates"
    )
    .version("0.1.0");

// Initialize CodeBrick
program
    .command("init")
    .description("Initialize CodeBrick in the system")
    .action(initCommand);

// Save a template
program
    .command("save <name> [path]")
    .description("Create a new LOCAL template from files")
    .option("-d, --description <desc>", "Template description")
    .option("-t, --tags <tags>", "Comma-separated tags")
    .option("--include <patterns>", "Glob patterns to include")
    .option("--exclude <patterns>", "Glob patterns to exclude")
    .option("--detect-deps", "Auto-detect dependencies from imports")
    .action(saveCommand);

// List templates
program
    .command("list")
    .alias("ls")
    .description("List all saved templates")
    .option("--local", "Show only local templates")
    .option("--remote", "Show only remote templates")
    .option("--tag <tag>", "Filter by tag")
    .option("--detailed", "Show detailed view")
    .action(listCommand);

// Tree view
program
    .command("tree <name>")
    .description("Display template file structure")
    .option("--size", "Show file sizes")
    .option("--preview", "Show content preview")
    .action(treeCommand);

// Apply template
program
    .command("apply <name> [destination]")
    .description("Apply template to current/specified directory")
    .option("-f, --force", "Overwrite existing files without prompting")
    .option("--skip-existing", "Skip files that already exist")
    .option("--dry-run", "Preview changes without writing files")
    .option("--latest", "Use @latest for all dependency versions")
    .option("--no-deps", "Don't prompt for dependency installation")
    .action(applyCommand);

// Info
program
    .command("info <name>")
    .description("Show detailed template information")
    .action(infoCommand);

// Add files to template
program
    .command("add <name> <files...>")
    .description("Add files to an existing LOCAL template")
    .action(addCommand);

// Remove files from template
program
    .command("remove-file <name> <files...>")
    .description("Remove files from a LOCAL template")
    .action(removeFileCommand);

// Delete template
program
    .command("delete <name>")
    .alias("rm")
    .description("Delete a template entirely")
    .option("-f, --force", "Skip confirmation")
    .action(deleteCommand);

// Size command
program
    .command("size [name]")
    .description("Show template size(s) - all templates if no name provided")
    .action(sizeCommand);

program.parse();
