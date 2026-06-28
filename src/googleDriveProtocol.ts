import { App } from "obsidian";
import type { GDriveSettings } from "./settings/interfaces";
import type { GoogleDriveTokenSet } from "rpg_shared/sync/googleDriveAuth";
import {
    createGoogleDriveSetupContext as createSharedGoogleDriveSetupContext,
    decryptGoogleDriveTokenSet,
    encryptObjectToBase64,
} from "rpg_shared/sync/googleDriveTokenCrypto";

export type GoogleDriveSetupContext = {
    setupId: string;
    authUrl: string;
}

export type GoogleDriveFolderEntry = {
    id: string;
    name: string;
    mimeType: "application/vnd.google-apps.folder";
}

type GoogleDriveListFoldersResponse = {
    files?: GoogleDriveFolderEntry[];
    nextPageToken?: string;
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
    const encryptedRefreshToken = existingRefreshToken || await encryptObjectToBase64(password, tokenSet.refreshToken || "");
    const encryptedAccessToken = await encryptObjectToBase64(password, tokenSet.accessToken)

    app.secretStorage.setSecret(GOOGLE_DRIVE_ACCESS_TOKEN_SECRET, encryptedAccessToken);

    if (encryptedRefreshToken) {
        app.secretStorage.setSecret(GOOGLE_DRIVE_REFRESH_TOKEN_SECRET, encryptedRefreshToken);
    }

    return {
        ...settings,
        configured: true,
        expiresAt: tokenSet.expiresAt,
        lastUpdated: new Date(),
    };
}

export function areTokensStored(app: App) {
    const secretIds = app.secretStorage.listSecrets();
    const found = [false, false];
    for (const secretId of secretIds) {
        if(secretId == GOOGLE_DRIVE_ACCESS_TOKEN_SECRET) found[0] = true;
        if(secretId == GOOGLE_DRIVE_REFRESH_TOKEN_SECRET) found[1] = true;
    }
    return found[0] && found[1];
}

export async function listFoldersIn({
    accessToken,
    rootFolderId = "root",
    orderBy = 'name',
    pageToken,
    take = 10
}: {
    accessToken: string,
    rootFolderId: string,
    orderBy?: 'name' | 'modifiedTime'
    pageToken?: string,
    take?: number
}): Promise<{
    folders: GoogleDriveFolderEntry[],
    pageToken?: string
}> {
    const q = [
        `'${rootFolderId}' in parents`,
        `mimeType = 'application/vnd.google-apps.folder'`,
        `trashed = false`,
    ].join(" and ");


    const params = new URLSearchParams({
        q,
        fields: "nextPageToken, files(id, name, mimeType)",
        pageSize: String(take),
        supportsAllDrives: "true",
        includeItemsFromAllDrives: "true",
        orderBy
    });

    if (pageToken) {
        params.set("pageToken", pageToken);
    }

    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Drive API error ${res.status}: ${errorText}`);
    }

    const data = await res.json() as GoogleDriveListFoldersResponse;
    
    return {
        folders: data.files ?? [],
        pageToken: data.nextPageToken
        
    } 

}