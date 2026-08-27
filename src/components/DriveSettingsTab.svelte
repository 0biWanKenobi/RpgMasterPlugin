<script lang="ts">
	import { 
        areTokensStored,
        clearAuthentication
    } from "../utils/googleDriveProtocol";
	import ConnectionManager from "./drivesync/ConnectionManager.svelte";
	import { HeaderWithIcon, UserPasswordModal } from "rpg_shared/ui/custom";
	import { SettingItem } from "rpg_shared/ui/obsidian";
	import { Button } from "rpg_shared/ui/base";
    import { setDriveAppProperties, isDriveFolderEmpty, getDriveFolderAppProperties } from "rpg_shared/sync/vaultPropertyCrud"; 
	import FolderSelector from "./drivesync/FolderSelector.svelte";
	import { MASTER_PLUGIN } from "../utils/capability";
	import { onMount } from "svelte";
	import { getAppContext } from "../context.svelte";
	import { getGoogleAccessToken, isGoogleAccessTokenExpired } from "../utils/driveSync/driveSession";
	import { Notice, Platform } from "obsidian";

    const { plugin, settings } = getAppContext()

    onMount(() =>  {
        folderStatus = settings.gdriveSettings.folderId ? "set" : "unset";
    })

    let folderStatus = $state<"unset" | "set" | "selecting">("unset")
    let showEditButton = $state(true)
    const authExpired = $derived.by(() => {
        const expiresAt = settings.gdriveSettings.expiresAt;
        if(!expiresAt) return "unknown"
        const expired = isGoogleAccessTokenExpired(expiresAt)

        return expired ? "yes" : "no";
    });

    const showFolderSettings = $derived(authExpired == 'no' || !!areTokensStored(plugin.app))
    const folderStatusIcon = $derived(
        folderStatus == 'set' || folderStatus == "selecting" ? "folder-heart" : "folder-x",
    )
    const folderStatusText = $derived(
        folderStatus == 'set'
            ? 'Remote folder selected'
            : folderStatus == 'unset'
                ? 'Remote folder not selected'
                : 'Select a folder',
    )

    const onEditFolder = () => {
        showEditButton = false;
        folderStatus = 'selecting';
    }

    let password = $state<string|undefined>()

    async function _getGoogleAccessToken(pwd: string) {
        const result = await getGoogleAccessToken(pwd, authExpired != 'no', plugin);
        
        if(result.success)
            return result.accessToken;

        new Notice(result.error);

        switch (result.reason) {
            case "invalid_password":
                password = undefined;
                return;
            case "cannot_authenticate":
                password = undefined;
                await clearAuthentication(plugin);
                return;
        }
    }

    async function onVaultRemoteFolderSelected(folderId: string, folderPath: string, newFolder: boolean) {
        if(!newFolder) {
            const valid = await checkDriveFolderVaultCandidate(folderId)
            if(!valid) return;
        }

        await saveVaultRemoteFolderToSettings(folderId, folderPath);
        if(newFolder) {
            setVaultIdOnFolder(folderId)
        }
    }

    async function checkDriveFolderVaultCandidate(folderId: string){
        if(!password) {
            new Notice("Cannot set Drive folder to track this Vault")
            return;
        }
        const token = await _getGoogleAccessToken(password);
        if(!token) {
            new Notice("Cannot set Drive folder to track this Vault")
            return;
        }
        const isEmpty = await isDriveFolderEmpty(token, folderId);
        const metadata = await getDriveFolderAppProperties(token, folderId)
        const remoteVaultId = metadata.appProperties?.vaultId
        let valid = true;
        if(!isEmpty){
            new Notice("Folder is not empty, cannot be used")
            valid = false;
        }
        if(!!remoteVaultId && remoteVaultId != plugin.app.appId ){
            new Notice("Folder is synced to another Vault")
            valid = false;
        }
        return valid;
    }

    async function saveVaultRemoteFolderToSettings(folderId: string, folderPath: string) {
        showEditButton = true;
        folderStatus = 'set';
        settings.gdriveSettings.folderId = folderId;
        settings.gdriveSettings.folderPath = folderPath;
        await plugin.saveSettings(MASTER_PLUGIN);
    }

    async function setVaultIdOnFolder(folderId: string) {
        if(!password) {
            new Notice("Cannot set Drive folder to track this Vault")
            return;
        }
        const token = await _getGoogleAccessToken(password);
        if(!token) {
            new Notice("Cannot set Drive folder to track this Vault")
            return;
        }
        await setDriveAppProperties(token, folderId, {
            vaultId: plugin.app.appId
        })
    }

    let pwdModalOpen = $state(false)
    let pwdAsync = Promise.withResolvers<string|undefined>()

</script>


<ConnectionManager bind:password/>

{#if showFolderSettings}
    <HeaderWithIcon icon={folderStatusIcon} text={folderStatusText} />

    {#if folderStatus == 'set'}
        <SettingItem name={settings.gdriveSettings.folderPath} class="folder-setting">
            {#if showEditButton}
                <Button class={Platform.isMobile ? "clickable-icon" : ""} icon="pencil" onClick={onEditFolder}/>
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
                if(!!password) return _getGoogleAccessToken(password)
                pwdModalOpen = true;
                const pwd = await pwdAsync.promise;
                password = pwd;
                pwdModalOpen = false;
                return pwd ? _getGoogleAccessToken(pwd) : undefined;
            }}
            onSelected={onVaultRemoteFolderSelected}
            onCancel={() => {
                showEditButton = true;
                folderStatus = settings.gdriveSettings.folderId ? 'set' : 'unset';
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

    :global(.is-phone .modal .setting-item) {
         &.folder-setting {
            flex-direction: row;
            align-items: center;

            :global(.setting-item-info) {
                align-self: auto;
            }

            :global(.setting-item-control) {
                align-items: center;
                width: unset;
                flex: 0 1 auto;
            }
         }
    }
</style>
