
/**
 * What this device knows about its last sync
 */
export type DocumentSyncState = {
	docId: string;
	driveFileId?: string;
	baseSha256?: string;
	remoteVersion?: string;
	lastSyncedAt?: number;
};

/** Result of comparing local, remote, and last-synced content. */
export type SyncDecision =
	| "noop"
	| "push"
	| "pull"
	| "conflict";


/** Device-local sync metadata keyed by RPG document ID. */
export type SyncState = {
	documents: Record<string, DocumentSyncState>;
};