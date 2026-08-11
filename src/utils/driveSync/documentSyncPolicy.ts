import type {
	App,
	FrontMatterCache,
	TFile,
} from "obsidian";

export type DocumentSyncPolicy = {
	docId: string;
	provider: "drive";
};

export function parseDocumentSyncPolicy(
	frontmatter: FrontMatterCache | undefined,
): DocumentSyncPolicy | null {
	if (!frontmatter?.rpg) {
		return null;
	}

	const { id, sync } = frontmatter.rpg;

	if (
		typeof id !== "string" ||
		id.trim().length === 0 ||
		sync !== "drive"
	) {
		return null;
	}

	return {
		docId: id,
		provider: "drive",
	};
}

export function getDocumentSyncPolicy(
	app: App,
	file: TFile,
): DocumentSyncPolicy | null {
	return parseDocumentSyncPolicy(
		app.metadataCache.getFileCache(file)?.frontmatter,
	);
}