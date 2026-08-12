<script lang="ts">
	import { Notice } from "obsidian";
	import { 
        areTokensStored,
        clearAuthentication,
        GOOGLE_DRIVE_ACCESS_TOKEN_SECRET,
        GOOGLE_DRIVE_REFRESH_TOKEN_SECRET
    } from "../utils/googleDriveProtocol";
	import ConnectionManager from "./drivesync/ConnectionManager.svelte";
	import { HeaderWithIcon, UserPasswordModal } from "rpg_shared/ui/custom";
	import { SettingItem } from "rpg_shared/ui/obsidian";
	import { Button } from "rpg_shared/ui/base";
	import FolderSelector from "./drivesync/FolderSelector.svelte";
	import { MASTER_PLUGIN } from "../utils/capability";
	import { saveDriveTokens } from "../utils/driveSync/driveSession";
	import { decryptObject } from "rpg_shared/sync/googleDriveTokenCrypto";
	import { type GoogleDriveTokenSet, refreshGoogleDriveAccessToken } from "rpg_shared/sync/googleDriveAuth";
	import { onMount } from "svelte";
	import { getAppContext } from "../context.svelte";


    
    let { plugin } = getAppContext()
    onMount(() =>  {
        folderStatus = pgSettings.gdriveSettings.folderId ? "set" : "unset";
    })

    const pgSettings = $derived(plugin.getSettings(MASTER_PLUGIN))
    let folderStatus = $state<"unset" | "set" | "selecting">("unset")
    let showEditButton = $state(true)
    const authExpired = $derived.by(() => {
        const expiresAt = pgSettings.gdriveSettings.expiresAt;
        if(!expiresAt) return "unknown"
        const remainingMs = expiresAt - Date.now();

        return remainingMs > 10000 ? "no" : "yes"
    });

    const showFolderSettings = $derived(authExpired == 'no' || !!areTokensStored(plugin.app))
    const folderStatusIcon = $derived(
        folderStatus == 'set' || folderStatus == "selecting" ? "folder-heart" : "folder-x",
    )
    const folderStatusText = $derived(
        folderStatus == 'set'
            ? 'Character folder selected'
            : folderStatus == 'unset'
                ? 'Character folder not selected'
                : 'Select a folder',
    )

    const onEditFolder = () => {
        showEditButton = false;
        folderStatus = 'selecting';
    }

    let password = $state<string|undefined>()

    async function getGoogleAccessToken(pwd: string) {
        if (authExpired != "no") {
            const refreshRes = await refreshGoogleAccessToken(pwd);
            switch (refreshRes) {
                case "success":
                    break;
                case "invalid_password":
                    password = undefined;
                    return;
                case "cannot_authenticate":
                    password = undefined;
                    await clearAuthentication(plugin);
                    return;
            }
        }

        const encryptedAccessToken = plugin.app.secretStorage.getSecret(GOOGLE_DRIVE_ACCESS_TOKEN_SECRET) ?? "";
        return await decryptObject<string>(
            pwd, encryptedAccessToken
        );
    }

    type RefreshResult = "success" | "invalid_password" | "cannot_authenticate"
    async function refreshGoogleAccessToken(password: string): Promise<RefreshResult> {
        const refreshToken: string = await decryptObject(password, plugin.app.secretStorage.getSecret(GOOGLE_DRIVE_REFRESH_TOKEN_SECRET) ?? "")

        if (!refreshToken) {
            new Notice("Invalid password!")
            return "invalid_password";
        }
        const tokenSet = await refreshGoogleDriveAccessToken(
            import.meta.env.VITE_GAUTH_URL,
            refreshToken
        )
        if (!tokenSet.success) {
            new Notice("Credentials refused, please login again");
            return "cannot_authenticate";
        }

        await _saveDriveTokens(
            password,
            {
                accessToken: tokenSet.access_token,
                refreshToken,
                expiresAt: tokenSet.expiresAt
            },
        );

        return "success";
    }

    async function _saveDriveTokens(password: string, tokenSet: GoogleDriveTokenSet) {
        await saveDriveTokens(password, tokenSet, plugin);
    }

    async function saveDriveFolderToSettings(folderId: string, folderPath: string) {
        showEditButton = true;
        folderStatus = 'set';
        pgSettings.gdriveSettings.folderId = folderId;
        pgSettings.gdriveSettings.folderPath = folderPath;
        await plugin.saveSettings(MASTER_PLUGIN);
    }

    let pwdModalOpen = $state(false)
    let pwdAsync = Promise.withResolvers<string|undefined>()

</script>


<ConnectionManager {plugin} pgsettings={pgSettings} bind:password/>

{#if showFolderSettings}
    <HeaderWithIcon icon={folderStatusIcon} text={folderStatusText} />

    {#if folderStatus == 'set'}
        <SettingItem name={pgSettings.gdriveSettings.folderPath} class="folder-setting">
            {#if showEditButton}
                <Button icon="pencil" onClick={onEditFolder}/>
            {/if}
        </SettingItem>
    {:else if folderStatus == 'unset' && areTokensStored(plugin.app)}
        <Button
            icon="folder-closed"
            text="Select Folder"
            onClick={() => {
                folderStatus = 'selecting'
            }}
        />
    {:else if folderStatus == 'selecting'}
        <FolderSelector 
            getAccessToken={async () => {
                if(!!password) return getGoogleAccessToken(password)
                pwdModalOpen = true;
                const pwd = await pwdAsync.promise;
                password = pwd;
                pwdModalOpen = false;
                return pwd ? getGoogleAccessToken(pwd) : undefined;
            }}
            onSelected={saveDriveFolderToSettings}
            onCancel={() => {
                showEditButton = true;
                folderStatus = pgSettings.gdriveSettings.folderId ? 'set' : 'unset';
            }}
        />
    {/if}
{/if}

<UserPasswordModal
    title="Please provide your Password"
    bind:open={pwdModalOpen}
    onCancel={() => {
        pwdModalOpen = false;
        pwdAsync.resolve(undefined);
        pwdAsync = Promise.withResolvers<string|undefined>();
    }}
    onReturn={(v) => {
        pwdModalOpen = false;
        pwdAsync.resolve(v);
        pwdAsync = Promise.withResolvers<string|undefined>();
    }}
/>

<style>
    :global(.folder-setting){
        background-color: var(--background-modifier-hover);
        padding-block: var(--size-4-1);
        padding-inline: var(--size-4-2);
        border-radius: var(--setting-items-radius);
    }
</style>
