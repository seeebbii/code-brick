import * as p from "@clack/prompts";
import pc from "picocolors";
import {
    isInitialized,
    loadStore,
    getTemplatePath,
    getTemplate,
    resolveTemplateName,
    getTemplateNames,
} from "../lib/storage.js";
import {
    getDirectoryStats,
    formatSize,
    createTable,
    truncate,
} from "../lib/utils.js";

export async function sizeCommand(nameOrIndex?: string): Promise<void> {
    // Check if initialized
    if (!(await isInitialized())) {
        p.log.error(
            "CodeBrick is not initialized. Run " + pc.cyan("brick init") + " first."
        );
        process.exit(1);
    }

    // If a specific template is requested
    if (nameOrIndex !== undefined) {
        await showSingleTemplateSize(nameOrIndex);
    } else {
        await showAllTemplateSizes();
    }
}

async function showSingleTemplateSize(nameOrIndex: string): Promise<void> {
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

    if (template.type === "remote") {
        console.log();
        console.log(pc.bold(pc.blue(name)) + pc.dim(" (remote)"));
        console.log();
        console.log(
            pc.yellow("Remote templates don't use local disk space.")
        );
        console.log(
            pc.dim("Files are fetched from GitHub on-demand when applied.")
        );
        console.log();
        return;
    }

    // Get size for local template
    const templatePath = getTemplatePath(name);
    const stats = await getDirectoryStats(templatePath);

    console.log();
    console.log(pc.bold(pc.green(name)));
    console.log();
    console.log(`  Files:       ${stats.files}`);
    console.log(`  Directories: ${stats.directories}`);
    console.log(`  Total Size:  ${pc.cyan(formatSize(stats.totalSize))}`);
    console.log();
}

async function showAllTemplateSizes(): Promise<void> {
    const store = await loadStore();
    const templates = Object.entries(store.templates);

    if (templates.length === 0) {
        console.log();
        console.log(pc.dim("  No templates saved yet"));
        console.log();
        return;
    }

    const headers = ["#", "Name", "Type", "Files", "Size"];
    const columnWidths = [3, 28, 8, 8, 12];

    const rows: string[][] = [];
    let totalSize = 0;
    let totalFiles = 0;

    for (let index = 0; index < templates.length; index++) {
        const [name, template] = templates[index];
        const typeColor = template.type === "local" ? pc.green : pc.blue;

        if (template.type === "local") {
            const templatePath = getTemplatePath(name);
            const stats = await getDirectoryStats(templatePath);
            totalSize += stats.totalSize;
            totalFiles += stats.files;

            rows.push([
                pc.yellow(index.toString()),
                truncate(name, columnWidths[1]),
                typeColor(template.type),
                stats.files.toString(),
                formatSize(stats.totalSize),
            ]);
        } else {
            rows.push([
                pc.yellow(index.toString()),
                truncate(name, columnWidths[1]),
                typeColor(template.type),
                pc.dim("-"),
                pc.dim("remote"),
            ]);
        }
    }

    console.log();
    console.log(createTable(headers, rows, columnWidths));
    console.log();
    console.log(
        pc.dim(`Total: ${totalFiles} files, ${pc.cyan(formatSize(totalSize))}`)
    );
    console.log();
}
