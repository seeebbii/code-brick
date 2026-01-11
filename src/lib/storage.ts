import fs from "fs-extra";
import path from "path";
import os from "os";

// Storage paths
export const CODEBRICK_DIR = path.join(os.homedir(), ".codebrick");
export const CONFIG_FILE = path.join(CODEBRICK_DIR, "config.json");
export const STORE_FILE = path.join(CODEBRICK_DIR, "store.json");
export const TEMPLATES_DIR = path.join(CODEBRICK_DIR, "templates");

// Types
export interface BrickConfig {
    githubToken?: string;
    defaultRef?: string;
}

export interface LocalTemplate {
    type: "local";
    path: string;
    description: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

export interface RemoteTemplate {
    type: "remote";
    github: {
        owner: string;
        repo: string;
        path: string;
        ref: string;
        commit: string | null;
    };
    description: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

export type Template = LocalTemplate | RemoteTemplate;

export interface Store {
    version: string;
    templates: Record<string, Template>;
}

export interface BrickMetadata {
    name: string;
    type: "local" | "remote";
    version: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    source: {
        origin: "local" | "github";
        path?: string;
        github?: {
            owner: string;
            repo: string;
            path: string;
            ref: string;
        };
    };
    files: string[];
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    tags: string[];
}

// Check if CodeBrick is initialized
export async function isInitialized(): Promise<boolean> {
    return fs.pathExists(CODEBRICK_DIR);
}

// Initialize storage structure
export async function initializeStorage(): Promise<void> {
    await fs.ensureDir(CODEBRICK_DIR);
    await fs.ensureDir(TEMPLATES_DIR);

    // Create config file if not exists
    if (!(await fs.pathExists(CONFIG_FILE))) {
        const defaultConfig: BrickConfig = {
            defaultRef: "main",
        };
        await fs.writeJson(CONFIG_FILE, defaultConfig, { spaces: 2 });
    }

    // Create store file if not exists
    if (!(await fs.pathExists(STORE_FILE))) {
        const defaultStore: Store = {
            version: "1.0",
            templates: {},
        };
        await fs.writeJson(STORE_FILE, defaultStore, { spaces: 2 });
    }
}

// Load config
export async function loadConfig(): Promise<BrickConfig> {
    if (!(await fs.pathExists(CONFIG_FILE))) {
        return {};
    }
    return fs.readJson(CONFIG_FILE);
}

// Save config
export async function saveConfig(config: BrickConfig): Promise<void> {
    await fs.writeJson(CONFIG_FILE, config, { spaces: 2 });
}

// Load store
export async function loadStore(): Promise<Store> {
    if (!(await fs.pathExists(STORE_FILE))) {
        return { version: "1.0", templates: {} };
    }
    return fs.readJson(STORE_FILE);
}

// Save store
export async function saveStore(store: Store): Promise<void> {
    await fs.writeJson(STORE_FILE, store, { spaces: 2 });
}

// Get template path
export function getTemplatePath(name: string): string {
    return path.join(TEMPLATES_DIR, name);
}

// Get template metadata path
export function getTemplateMetadataPath(name: string): string {
    return path.join(getTemplatePath(name), "brick.json");
}

// Load template metadata
export async function loadTemplateMetadata(
    name: string
): Promise<BrickMetadata | null> {
    const metadataPath = getTemplateMetadataPath(name);
    if (!(await fs.pathExists(metadataPath))) {
        return null;
    }
    return fs.readJson(metadataPath);
}

// Save template metadata
export async function saveTemplateMetadata(
    name: string,
    metadata: BrickMetadata
): Promise<void> {
    const metadataPath = getTemplateMetadataPath(name);
    await fs.writeJson(metadataPath, metadata, { spaces: 2 });
}

// Check if template exists
export async function templateExists(name: string): Promise<boolean> {
    const store = await loadStore();
    return name in store.templates;
}

// Get template
export async function getTemplate(name: string): Promise<Template | null> {
    const store = await loadStore();
    return store.templates[name] || null;
}

// Add template to store
export async function addTemplateToStore(
    name: string,
    template: Template
): Promise<void> {
    const store = await loadStore();
    store.templates[name] = template;
    await saveStore(store);
}

// Remove template from store
export async function removeTemplateFromStore(name: string): Promise<void> {
    const store = await loadStore();
    delete store.templates[name];
    await saveStore(store);
}

// Delete template files
export async function deleteTemplateFiles(name: string): Promise<void> {
    const templatePath = getTemplatePath(name);
    if (await fs.pathExists(templatePath)) {
        await fs.remove(templatePath);
    }
}

// Get all template names in order
export async function getTemplateNames(): Promise<string[]> {
    const store = await loadStore();
    return Object.keys(store.templates);
}

// Resolve template name from index or name
// Returns the actual template name, or null if not found
export async function resolveTemplateName(
    nameOrIndex: string
): Promise<string | null> {
    const store = await loadStore();
    const names = Object.keys(store.templates);

    // Check if it's a numeric index
    const index = parseInt(nameOrIndex, 10);
    if (!isNaN(index) && index >= 0 && index < names.length) {
        return names[index];
    }

    // Check if it's a direct name match
    if (nameOrIndex in store.templates) {
        return nameOrIndex;
    }

    return null;
}
