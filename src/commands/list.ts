import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  isInitialized,
  loadStore,
  loadTemplateMetadata,
  LocalTemplate,
  RemoteTemplate,
} from "../lib/storage.js";
import { createTable, formatDate, truncate } from "../lib/utils.js";

interface ListOptions {
  local?: boolean;
  remote?: boolean;
  tag?: string;
  detailed?: boolean;
}

export async function listCommand(options: ListOptions): Promise<void> {
  // Check if initialized
  if (!(await isInitialized())) {
    p.log.error(
      "CodeBrick is not initialized. Run " + pc.cyan("brick init") + " first."
    );
    process.exit(1);
  }

  const store = await loadStore();
  let templates = Object.entries(store.templates);

  // Filter by type
  if (options.local) {
    templates = templates.filter(([, t]) => t.type === "local");
  } else if (options.remote) {
    templates = templates.filter(([, t]) => t.type === "remote");
  }

  // Filter by tag
  if (options.tag) {
    templates = templates.filter(([, t]) =>
      t.tags.some((tag) => tag.toLowerCase() === options.tag?.toLowerCase())
    );
  }

  if (templates.length === 0) {
    console.log();
    if (options.tag) {
      console.log(pc.dim(`  No templates found with tag '${options.tag}'`));
    } else if (options.local) {
      console.log(pc.dim("  No local templates found"));
    } else if (options.remote) {
      console.log(pc.dim("  No remote templates found"));
    } else {
      console.log(pc.dim("  No templates saved yet"));
      console.log();
      console.log(
        `  Get started: ${pc.cyan("brick save")} my-template ./path/to/code`
      );
    }
    console.log();
    return;
  }

  if (options.detailed) {
    await renderDetailedList(templates);
  } else {
    renderTableList(templates);
  }

  // Summary
  const localCount = templates.filter(([, t]) => t.type === "local").length;
  const remoteCount = templates.filter(([, t]) => t.type === "remote").length;

  console.log();
  if (localCount > 0 && remoteCount > 0) {
    console.log(
      pc.dim(`Total: ${templates.length} templates (${localCount} local, ${remoteCount} remote)`)
    );
  } else {
    console.log(pc.dim(`Total: ${templates.length} template${templates.length === 1 ? "" : "s"}`));
  }
  console.log();
    console.log(pc.dim("Tip: Use index or name with commands, e.g., brick tree 0"));
    console.log();
}

function renderTableList(
  templates: [string, LocalTemplate | RemoteTemplate][]
): void {
    const headers = ["#", "Name", "Type", "Description"];
    const columnWidths = [3, 28, 8, 36];

    const rows = templates.map(([name, template], index) => {
    const typeColor = template.type === "local" ? pc.green : pc.blue;
    return [
        pc.yellow(index.toString()),
        truncate(name, columnWidths[1]),
      typeColor(template.type),
        truncate(template.description || "-", columnWidths[3]),
    ];
  });

  console.log();
  console.log(createTable(headers, rows, columnWidths));
}

async function renderDetailedList(
  templates: [string, LocalTemplate | RemoteTemplate][]
): Promise<void> {
  const localTemplates = templates.filter(([, t]) => t.type === "local");
  const remoteTemplates = templates.filter(([, t]) => t.type === "remote");

    // Track global index
    let globalIndex = 0;

  console.log();

  if (localTemplates.length > 0) {
    console.log(pc.bold("LOCAL TEMPLATES"));
    console.log(pc.dim("───────────────"));
    console.log();

    for (const [name, template] of localTemplates) {
      const metadata = await loadTemplateMetadata(name);
      const fileCount = metadata?.files.length || 0;

        console.log(pc.yellow(`[${globalIndex}]`) + " " + pc.bold(pc.green(name)));
        console.log(`    Type:        ${pc.dim("local")}`);
        console.log(`    Description: ${template.description || pc.dim("No description")}`);
        console.log(`    Files:       ${fileCount} files`);
      if (template.tags.length > 0) {
          console.log(`    Tags:        ${template.tags.join(", ")}`);
      }
        console.log(`    Created:     ${formatDate(template.createdAt)}`);
        console.log(`    Updated:     ${formatDate(template.updatedAt)}`);
      console.log();
        globalIndex++;
    }
  }

  if (remoteTemplates.length > 0) {
    if (localTemplates.length > 0) {
      console.log();
    }
    console.log(pc.bold("REMOTE TEMPLATES (GitHub)"));
    console.log(pc.dim("─────────────────────────"));
    console.log();

    for (const [name, template] of remoteTemplates) {
      const remote = template as RemoteTemplate;
      const source = `github:${remote.github.owner}/${remote.github.repo}/${remote.github.path}`;
      const ref = remote.github.commit
        ? `${remote.github.ref} @ ${remote.github.commit.slice(0, 7)}`
        : remote.github.ref;

        console.log(pc.yellow(`[${globalIndex}]`) + " " + pc.bold(pc.blue(name)));
        console.log(`    Type:        ${pc.dim("remote")}`);
        console.log(`    Source:      ${source}`);
        console.log(`    Ref:         ${ref}`);
        console.log(`    Description: ${template.description || pc.dim("No description")}`);
      if (template.tags.length > 0) {
          console.log(`    Tags:        ${template.tags.join(", ")}`);
      }
        console.log(`    Linked:      ${formatDate(template.createdAt)}`);
      console.log();
        globalIndex++;
    }
  }
}
