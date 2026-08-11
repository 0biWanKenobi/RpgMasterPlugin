import type { SyncDecision } from "./types";

/** Determines the required sync action from content hashes. */
export function decideSync(
	baseHash: string,
	localHash: string,
	remoteHash: string,
): SyncDecision {
	const localChanged = localHash !== baseHash;
	const remoteChanged = remoteHash !== baseHash;

	if (!localChanged && !remoteChanged) return "noop";
	if (localChanged && !remoteChanged) return "push";
	if (!localChanged && remoteChanged) return "pull";

	return "conflict";
}

/** Determines the action before a common sync base exists. */
export function decideInitialSync(
	localHash: string,
	remoteHash?: string,
): SyncDecision {
	if (!remoteHash) return "push";
	if (localHash === remoteHash) return "noop";

	return "conflict";
}

/** Returns the SHA-256 hash of UTF-8 text. */
export async function hashContent(content: string): Promise<string> {
	const bytes = new TextEncoder().encode(content);
	const digest = await crypto.subtle.digest("SHA-256", bytes);

	return Array.from(new Uint8Array(digest))
		.map(byte => byte.toString(16).padStart(2, "0"))
		.join("");
}