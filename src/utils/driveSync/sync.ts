import type { App, TFile } from "obsidian";
import type { DocumentSyncPolicy } from "./documentSyncPolicy";
import type { DocumentSyncState, SyncState } from "./types";
import { decideInitialSync, decideSync } from "./syncDecision";
import { setDocumentSyncState } from "./syncState";
import {
	createDriveDocument,
	downloadDriveDocument,
	findDriveDocumentByDocId,
    updateDriveDocument,
} from "rpg_shared/sync/googleDriveOperations";

import { hashContent } from "./syncDecision";

/** Ensures a Drive document exists for the local file. */
export async function bootstrapDriveDocument(
	app: App,
	file: TFile,
	policy: DocumentSyncPolicy,
	accessToken: string,
	folderId: string,
) {
	const existing = await findDriveDocumentByDocId(
		accessToken,
		folderId,
		policy.docId,
	);

	if (!existing.success) return existing;

	const content = await app.vault.cachedRead(file);
	const localHash = await hashContent(content);

	if (existing.noMetadata == undefined) {
		return {
			success: true as const,
			metadata: existing.metadata,
			localHash,
			created: false as const,
		};
	}

	const created = await createDriveDocument(
		accessToken,
		folderId,
		policy.docId,
		file.name,
		content,
	);

	if (!created.success) return created;

	return {
		success: true as const,
		metadata: created.metadata,
		localHash,
		created: true as const,
	};
}


type SyncDocumentResult =
	| { success: true; status: "synced" }
	| { success: true; status: "conflict" }
	| { success: false; error: string; errorMessage: string };

/** Performs the initial v1 sync and persists its local sync state. */
/** Synchronizes one RPG document. */
export async function syncDocument(
	app: App,
	file: TFile,
	policy: DocumentSyncPolicy,
	syncState: SyncState,
	accessToken: string,
	folderId: string,
	saveState: () => Promise<void>,
): Promise<SyncDocumentResult> {
	const previousState = syncState.documents[policy.docId];

	if (previousState?.baseSha256) {
		return syncExistingDocument(
			app,
			file,
			policy,
			previousState,
			accessToken,
			folderId,
			saveState
		);
	}

	return syncInitialDocument(
		app,
		file,
		policy,
		syncState,
		accessToken,
		folderId,
		saveState,
	);
}

async function syncExistingDocument(
	app: App,
	file: TFile,
	policy: DocumentSyncPolicy,
	state: DocumentSyncState,
	accessToken: string,
	folderId: string,
    saveState: () => Promise<void>,
): Promise<SyncDocumentResult> {
	const remote = await findDriveDocumentByDocId(
	accessToken,
	folderId,
	policy.docId,
);

    if (!remote.success) return remote;

    if (remote.noMetadata) {
        return {
            success: false,
            error: "Remote document missing",
            errorMessage: `Drive file missing for RPG document ${policy.docId}`,
        };
    }

    const content = await app.vault.cachedRead(file);
    const localHash = await hashContent(content);

    const remoteHash = remote.metadata.sha256Checksum;

    if (!remoteHash) {
        return {
            success: false,
            error: "Remote checksum unavailable",
            errorMessage: `Cannot determine sync state for RPG document ${policy.docId}`,
        };
    }

    if (!state.baseSha256) {
        return {
            success: false,
            error: "Missing base checksum",
            errorMessage: `No sync base available for RPG document ${policy.docId}`,
        };
    }

    const decision = decideSync(
        state.baseSha256,
        localHash,
        remoteHash,
    );

    if (decision === "noop") {
        state.remoteVersion = remote.metadata.version;
        state.lastSyncedAt = Date.now();

        await saveState();

        return {
            success: true,
            status: "synced",
        };
    }

    if (decision === "push") {
        const updated = await updateDriveDocument(
            accessToken,
            remote.metadata.id,
            content,
        );

        if (!updated.success) return updated;

        state.baseSha256 =
            updated.metadata.sha256Checksum ?? localHash;
        state.remoteVersion = updated.metadata.version;
        state.lastSyncedAt = Date.now();

        await saveState();

        return {
            success: true,
            status: "synced",
        };
    }

	if (decision === "pull") {
		const downloaded = await downloadDriveDocument(
			accessToken,
			remote.metadata.id,
		);

		if (!downloaded.success) return downloaded;

		await app.vault.modify(file, downloaded.content);

		state.baseSha256 = remoteHash;
		state.remoteVersion = remote.metadata.version;
		state.lastSyncedAt = Date.now();

		await saveState();

		return {
			success: true,
			status: "synced",
		};
	}

	return {
		success: true,
		status: "conflict",
	};
}

/** Performs the first sync for a document with no local sync history. */
async function syncInitialDocument(
	app: App,
	file: TFile,
	policy: DocumentSyncPolicy,
	syncState: SyncState,
	accessToken: string,
	folderId: string,
	saveState: () => Promise<void>,
): Promise<SyncDocumentResult> {
	const result = await bootstrapDriveDocument(
		app,
		file,
		policy,
		accessToken,
		folderId,
	);

	if (!result.success) return result;

	if (!result.created) {
		const decision = decideInitialSync(
			result.localHash,
			result.metadata.sha256Checksum,
		);

		if (decision === "conflict") {
			return {
				success: true,
				status: "conflict",
			};
		}
	}

	setDocumentSyncState(syncState, policy.docId, {
		driveFileId: result.metadata.id,
		baseSha256:
			result.metadata.sha256Checksum ??
			result.localHash,
		remoteVersion: result.metadata.version,
		lastSyncedAt: Date.now(),
	});

	await saveState();

	return {
		success: true,
		status: "synced",
	};
}