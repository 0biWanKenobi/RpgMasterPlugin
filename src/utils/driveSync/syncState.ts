import type {
	DocumentSyncState,
	SyncState,
} from "./types";

/** Returns locally persisted sync state for a document. */
export function getDocumentSyncState(
	state: SyncState,
	docId: string,
): DocumentSyncState | undefined {
	return state.documents[docId];
}

/** Creates or updates locally persisted sync state for a document. */
export function setDocumentSyncState(
	state: SyncState,
	docId: string,
	update: Partial<DocumentSyncState>,
): DocumentSyncState {
	state.documents[docId] = Object.assign({docId}, state.documents[docId], update);
	return state.documents[docId];
}