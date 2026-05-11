import { App } from "obsidian";
import type { GDriveSettings } from "./settings/interfaces";
import type { GoogleDriveTokenSet } from "rpg_shared/sync/googleDriveAuth";
import {
	createGoogleDriveSetupContext as createSharedGoogleDriveSetupContext,
	decryptGoogleDriveTokenSet,
    encryptText,
} from "rpg_shared/sync/googleDriveTokenCrypto";

export type { GoogleDriveTokenSet } from "rpg_shared/sync/googleDriveAuth";

export type GoogleDriveSetupContext = {
	setupId: string;
	authUrl: string;
}



export const GOOGLE_DRIVE_ACCESS_TOKEN_SECRET = "rpg-master-google-access-token";
export const GOOGLE_DRIVE_REFRESH_TOKEN_SECRET = "rpg-master-google-refresh-token";



export function createGoogleDriveSetupContext(app: App, authUrl: string): GoogleDriveSetupContext {
	const context = createSharedGoogleDriveSetupContext(authUrl);

	app.secretStorage.setSecret(context.setupId, context.setupKey);
	return {
		setupId: context.setupId,
		authUrl: context.authUrl,
	};
}

export function clearGoogleDriveSetupContext(app: App, setupId: string): void {
	app.secretStorage.deleteSecret(setupId)
}

export async function decryptGoogleDrivePayload(
	app: App,
	setupId: string,
	payload: string,
): Promise<GoogleDriveTokenSet> {
	const setupKey = app.secretStorage.getSecret(setupId);

	if (!setupKey) {
		throw new Error("Missing pending Google Drive setup key.");
	}

	return decryptGoogleDriveTokenSet(setupKey, payload);
}

export async function persistGoogleDriveTokens(
	app: App,
	settings: GDriveSettings,
	tokenSet: GoogleDriveTokenSet,
    password: string,
): Promise<GDriveSettings> {
	const existingRefreshToken = app.secretStorage.getSecret(GOOGLE_DRIVE_REFRESH_TOKEN_SECRET);
	const refreshToken = await encryptText(password, tokenSet.refreshToken || existingRefreshToken || "");

	app.secretStorage.setSecret(GOOGLE_DRIVE_ACCESS_TOKEN_SECRET, tokenSet.accessToken);

	if (refreshToken) {
		app.secretStorage.setSecret(GOOGLE_DRIVE_REFRESH_TOKEN_SECRET, refreshToken);
	}

	return {
		...settings,
		configured: true,
		tokenType: tokenSet.tokenType,
		scope: tokenSet.scope,
		expiresAt: tokenSet.expiresAt,
		lastUpdated: new Date(),
	};
}

export async function listFilesInFolderByMimeType({
 accessToken,
 folderId
}: {
 accessToken: string,
 folderId: string
}) {
 const query = [
  `'${folderId}' in parents`,
  `mimeType = 'text/markdown'`,
  `trashed = false`,
 ].join(" and ");

 const params = new URLSearchParams({
  q: query,
  fields: "nextPageToken, files(id, name, mimeType, webViewLink, modifiedTime)",
  pageSize: "1000",
  supportsAllDrives: "true",
  includeItemsFromAllDrives: "true",
 });

 const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
  headers: {
   Authorization: `Bearer ${accessToken}`,
  },
 });

 if (!res.ok) {
  const errorText = await res.text();
  throw new Error(`Drive API error ${res.status}: ${errorText}`);
 }

 const data = await res.json();
 return data.files ?? [];
}

export async function findFolderByPath({
 accessToken,
 path,
 rootFolderId = "root",
}: {
 accessToken: string,
 path: string,
 rootFolderId: string
}) {
 const parts = path
  .split("/")
  .map(part => part.trim())
  .filter(Boolean);

 let parentId = rootFolderId;

 for (const folderName of parts) {
  const q = [`
   '${parentId}' in parents`,
   `name = '${escapeDriveQueryValue(folderName)}'`,
   `mimeType = 'application/vnd.google-apps.folder'`,
   `trashed = false`,
  ].join(" and ");

  const params = new URLSearchParams({
   q,
   fields: "files(id, name, mimeType)",
   pageSize: "10",
   supportsAllDrives: "true",
   includeItemsFromAllDrives: "true",
  });

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
   headers: {
    Authorization: `Bearer ${accessToken}`,
   },
  });

  if (!res.ok) {
   const errorText = await res.text();
   throw new Error(`Drive API error ${res.status}: ${errorText}`);
  }

  const data = await res.json();
  const matches = data.files ?? [];

  if (matches.length === 0) {
   return null;
  }

  // Drive allows duplicate folder names under the same parent.
  // Pick the first, or handle ambiguity explicitly.
  parentId = matches[0].id;
 }

 return {
  id: parentId,
  path,
  exists: true,
 };
}

function escapeDriveQueryValue(value: string) {
 return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}