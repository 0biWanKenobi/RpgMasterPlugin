<script lang="ts">
	import { Notice } from "obsidian";
	import { areTokensStored, GOOGLE_DRIVE_ACCESS_TOKEN_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN_SECRET } from "../googleDriveProtocol";
	import ConnectionManager from "../settings/driveSync/connectionManager.svelte";
	import { HeaderWithIcon, UserPasswordModal } from "rpg_shared/ui/custom";
	import { SettingItem } from "rpg_shared/ui/obsidian";
	import { Button } from "rpg_shared/ui/base";
	import FolderSelector from "./ui/FolderSelector.svelte";
	import { MASTER_PLUGIN } from "../capability";
	import { saveDriveTokens } from "../settings/driveSync/utilities";
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

    async function getGoogleAccessToken(password: string) {
        if (authExpired != "no") {
            const success = await refreshGoogleAccessToken(password);
            if(!success) return;
        }

        const encryptedAccessToken = plugin.app.secretStorage.getSecret(GOOGLE_DRIVE_ACCESS_TOKEN_SECRET) ?? "";
        return await decryptObject<string>(
            password, encryptedAccessToken
        );
    }

    async function refreshGoogleAccessToken(password: string): Promise<boolean> {
        const refreshToken: string = await decryptObject(password, plugin.app.secretStorage.getSecret(GOOGLE_DRIVE_REFRESH_TOKEN_SECRET) ?? "")

        if (!refreshToken) {
            new Notice("Invalid password!")
            return false;
        }
        const tokenSet = await refreshGoogleDriveAccessToken(
            import.meta.env.VITE_GAUTH_URL,
            refreshToken
        )
        if (!tokenSet.success) {
            new Notice("Cannot authenticate");
            return false;
        }

        await _saveDriveTokens(
            password,
            {
                accessToken: tokenSet.access_token,
                refreshToken,
                expiresAt: tokenSet.expiresAt
            },
        );

        return true;
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

    const pwdModalState = $state({
        ref: undefined as UserPasswordModal | undefined,
        open: false,
        onConfirm: (_: string) => {}
    })

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
                if(!!password) return password
                pwdModalState.open = true;
                pwdAsync = Promise.withResolvers<string|undefined>();
                const pwd = await pwdAsync.promise;
                password = pwd;
                pwdModalState.open = false;
                return pwd ? getGoogleAccessToken(pwd) : pwd;
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
    bind:this={pwdModalState.ref}
    title="Please provide your Password"
    bind:open={pwdModalState.open}
    onCancel={() => {
        pwdModalState.open = false;
        pwdAsync.resolve(undefined);
    }}
    onReturn={(v) => {
        pwdModalState.open = false;
        pwdAsync.resolve(v);
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
