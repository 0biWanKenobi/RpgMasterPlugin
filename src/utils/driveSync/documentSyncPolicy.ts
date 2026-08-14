import type {
	App,
	FrontMatterCache,
	TFile,
} from "obsidian";

export type DocumentSyncPolicy = {
	docId: string;
	sync: boolean;
};

function parseDocumentSyncPolicy(
	frontmatter: FrontMatterCache | undefined,
): DocumentSyncPolicy | null {
	if (!frontmatter?.rpg) {
		return null;
	}

	const { docId, sync } = frontmatter.rpg;

	if (
		typeof docId !== "string" ||
		docId.trim().length === 0 ||
		typeof sync !== "boolean"
	) {
		return null;
	}

	return frontmatter.rpg;
}

export function getDocumentSyncPolicy(
	app: App,
	file: TFile,
): DocumentSyncPolicy | null {
	return parseDocumentSyncPolicy(
		app.metadataCache.getFileCache(file)?.frontmatter,
	);
}