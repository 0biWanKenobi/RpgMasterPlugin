import RPGDungeonMasterPlugin from "../../rpgMasterPlugin";
import { MASTER_PLUGIN } from "../capability";
import { GOOGLE_DRIVE_ACCESS_TOKEN_SECRET, persistGoogleDriveTokens } from "../googleDriveProtocol";
import { decryptObject } from "rpg_shared/sync/googleDriveTokenCrypto";
import {
	refreshGoogleDriveAccessToken,
	type GoogleDriveTokenSet,
} from "rpg_shared/sync/googleDriveAuth";

import {
	GOOGLE_DRIVE_REFRESH_TOKEN_SECRET,
} from "../googleDriveProtocol";

const saveDriveTokens = async (password: string, tokenSet: GoogleDriveTokenSet, plugin: RPGDungeonMasterPlugin) => {
    const pluginSettings = plugin.getSettings(MASTER_PLUGIN);

    pluginSettings.gdriveSettings = await persistGoogleDriveTokens(
        plugin.app,
        pluginSettings.gdriveSettings,
        tokenSet,
        password
    );
    await plugin.saveSettings(MASTER_PLUGIN);
}

type DriveRefreshResult =
	| { success: true, reason?: string }
	| {
		success: false;
		reason: "invalid_password" | "cannot_authenticate";
		error: string;
	};

/** Refreshes and persists the Google Drive access token. */
async function refreshGoogleAccessToken(
	password: string,
	plugin: RPGDungeonMasterPlugin,
): Promise<DriveRefreshResult> {
	const encryptedRefreshToken = plugin.app.secretStorage.getSecret(GOOGLE_DRIVE_REFRESH_TOKEN_SECRET) ?? "";

	let refreshToken = "";
    let refreshDecryptError: string | undefined = undefined;

	try {
		refreshToken = await decryptObject(password, encryptedRefreshToken);
        if(!refreshToken) refreshDecryptError = "Invalid password";
	} catch (error) {
        refreshDecryptError = String(error);
	}
    if(refreshDecryptError) return {
        success: false,
        reason: "invalid_password",
        error: refreshDecryptError,
    };

	const result = await refreshGoogleDriveAccessToken(
		import.meta.env.VITE_GAUTH_URL,
		refreshToken,
	);

	if (!result.success) {
		return {
			success: false,
			reason: "cannot_authenticate",
			error: result.error,
		};
	}

	await saveDriveTokens(
		password,
		{
			accessToken: result.access_token,
			refreshToken,
			expiresAt: result.expiresAt,
		},
		plugin,
	);

	return { success: true };
}

type GoogleAccessTokenResult =
    | { success: true; accessToken: string }
	| {
		success: false;
		reason: "invalid_password" | "cannot_authenticate";
		error: string;
	}

async function getGoogleAccessToken(
    pwd: string,
    authExpired: boolean,
    plugin: RPGDungeonMasterPlugin
): Promise<GoogleAccessTokenResult> {
    if (authExpired) {
        const refreshRes = await refreshGoogleAccessToken(pwd, plugin);
        if(!refreshRes.success) {
            return refreshRes;
        }
    }

    const encryptedAccessToken = plugin.app.secretStorage.getSecret(GOOGLE_DRIVE_ACCESS_TOKEN_SECRET) ?? "";
    let clearAccessToken: string | undefined = undefined;
    try {
        clearAccessToken = await decryptObject(pwd, encryptedAccessToken);
    } catch (error) {
        return {
            success: false,
            reason: "invalid_password",
            error: String(error),
        };
    }
    return clearAccessToken 
        ? { success: true, accessToken: clearAccessToken }
        : {
            success: false,
            reason: "cannot_authenticate",
            error: "No access token available",
        };
}

/** Returns whether the Google Drive access token should be refreshed. */
function isGoogleAccessTokenExpired(
	expiresAt?: number,
): boolean {
	if (!expiresAt) return true;

	return expiresAt - Date.now() <= 10_000;
}


Object.freeze(saveDriveTokens.prototype)
Object.freeze(getGoogleAccessToken.prototype)
Object.freeze(isGoogleAccessTokenExpired.prototype)

export {saveDriveTokens, getGoogleAccessToken, isGoogleAccessTokenExpired}