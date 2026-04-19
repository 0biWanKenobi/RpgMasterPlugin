import { App } from "obsidian";
import type { GDriveSettings } from "./settings/interfaces";
import type { GoogleDriveTokenSet } from "rpg_shared/sync/googleDriveAuth";
import {
	createGoogleDriveSetupContext as createSharedGoogleDriveSetupContext,
	decryptGoogleDriveTokenSet,
} from "rpg_shared/sync/googleDriveTokenCrypto";

export type { GoogleDriveTokenSet } from "rpg_shared/sync/googleDriveAuth";

export type GoogleDriveSetupContext = {
	setupId: string;
	authUrl: string;
}

const GOOGLE_DRIVE_SETUP_SECRET_PREFIX = "rpg-master-google-setup";

export const GOOGLE_DRIVE_ACCESS_TOKEN_SECRET = "rpg-master-google-access-token";
export const GOOGLE_DRIVE_REFRESH_TOKEN_SECRET = "rpg-master-google-refresh-token";

function buildSetupSecretId(setupId: string): string {
	return `${GOOGLE_DRIVE_SETUP_SECRET_PREFIX}-${setupId}`;
}

export function createGoogleDriveSetupContext(app: App, authUrl: string): GoogleDriveSetupContext {
	const context = createSharedGoogleDriveSetupContext(authUrl);

	app.secretStorage.setSecret(buildSetupSecretId(context.setupId), context.setupKey);
	return {
		setupId: context.setupId,
		authUrl: context.authUrl,
	};
}

export function clearGoogleDriveSetupContext(app: App, setupId: string): void {
	app.secretStorage.deleteSecret(buildSetupSecretId(setupId))
}

export async function decryptGoogleDrivePayload(
	app: App,
	setupId: string,
	payload: string,
): Promise<GoogleDriveTokenSet> {
	const setupSecretId = buildSetupSecretId(setupId);
	const setupKey = app.secretStorage.getSecret(setupSecretId);

	if (!setupKey) {
		throw new Error("Missing pending Google Drive setup key.");
	}

	return decryptGoogleDriveTokenSet(setupKey, payload);
}

export function persistGoogleDriveTokens(
	app: App,
	settings: GDriveSettings,
	tokenSet: GoogleDriveTokenSet,
): GDriveSettings {
	const existingRefreshToken = app.secretStorage.getSecret(GOOGLE_DRIVE_REFRESH_TOKEN_SECRET);
	const refreshToken = tokenSet.refreshToken || existingRefreshToken || "";

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
