<script lang="ts">
	import { 
        areTokensStored,
        clearAuthentication
    } from "../utils/googleDriveProtocol";
	import ConnectionManager from "./drivesync/ConnectionManager.svelte";
	import { ConfirmModal, HeaderWithIcon, UserPasswordModal } from "rpg_shared/ui/custom";
	import { SettingItem } from "rpg_shared/ui/obsidian";
	import { Button } from "rpg_shared/ui/base";
    import { setDriveAppProperties, isDriveFolderEmpty, getDriveFolderAppProperties } from "rpg_shared/sync/vaultPropertyCrud"; 
	import FolderSelector from "./drivesync/FolderSelector.svelte";
	import { MASTER_PLUGIN } from "../utils/capability";
	import { mount, onMount } from "svelte";
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

    let adoptVaultModalOpen = $state(false);
    let confirmedAsync: PromiseWithResolvers<boolean> |undefined = undefined;

    async function onVaultRemoteFolderSelected(folderId: string, folderPath: string) {
        const {valid, remoteVaultId, couldAdopt} = await checkDriveFolderVaultCandidate(folderId)
        if(!valid) {
            if(!couldAdopt)
                return
            // ask user's confirmation that we can set the selected folder id as our vault id.
            confirmedAsync = Promise.withResolvers<boolean>();
            adoptVaultModalOpen = true;
            const confirmed = await confirmedAsync.promise;
            confirmedAsync = undefined;

            if(!confirmed) return;

            settings.vaultId = remoteVaultId
            await plugin.saveSettings(MASTER_PLUGIN);
        }
        if(!remoteVaultId){
            const localVaultIdInitialized = !!settings.vaultId;
            const vaultId = localVaultIdInitialized ? settings.vaultId! : window.crypto.randomUUID();
            const success = await setVaultIdOnFolder(folderId, vaultId)
            if(!success)
                return
            
            if(!localVaultIdInitialized) {
                settings.vaultId = vaultId;
                await plugin.saveSettings(MASTER_PLUGIN);
            }
        }

        await saveVaultRemoteFolderToSettings(folderId, folderPath);
    }

    /**
     * Check if selected Drive folder is a valid choice to store vault data into.
     * @param folderId
     */
    async function checkDriveFolderVaultCandidate(folderId: string): Promise<{valid: boolean, remoteVaultId?: string, couldAdopt?: boolean}>{
        if(!password) {
            new Notice("Cannot set Drive folder to track this Vault")
            return {
                valid: false,
            };;
        }
        const token = await _getGoogleAccessToken(password);
        if(!token) {
            new Notice("Cannot set Drive folder to track this Vault")
            return {
                valid: false,
            };
        }
        
        const metadata = await getDriveFolderAppProperties(token, folderId)
        const remoteVaultId = metadata.appProperties?.vaultId
        

        if(settings.vaultId) {
            if(remoteVaultId) {
                if(settings.vaultId == remoteVaultId) return { valid: true, remoteVaultId} // found our remote vault counterpart
                new Notice("Synced to a different Vault, cannot be used")
                return {valid: false, remoteVaultId} // ours and remote are 2 different vaults
            }

            else {
                const isEmpty = await isDriveFolderEmpty(token, folderId);
                if(isEmpty) return { valid: true, remoteVaultId} // we have our vault locally, start using remote as vault
                new Notice("Folder is not empty, cannot be used")
                return {valid: false, remoteVaultId} // remote is a regular Drive folder already used, cannot adopt
            }
        }

        else {
            if(remoteVaultId){
                return {valid: false, remoteVaultId, couldAdopt: true} // We cannot know whose vault this is, user confirmation is required.
            }
            
            else {
                const isEmpty = await isDriveFolderEmpty(token, folderId);
                if(isEmpty) return { valid: true, remoteVaultId} // we don't have an id ourselves, and the remote is empty, so ok

                new Notice("Folder is not empty, cannot be used")
                return {valid: false, remoteVaultId} // remote is a regular Drive folder already used, cannot adopt
            }
        }
    }

    async function saveVaultRemoteFolderToSettings(folderId: string, folderPath: string) {
        showEditButton = true;
        folderStatus = 'set';
        settings.gdriveSettings.folderId = folderId;
        settings.gdriveSettings.folderPath = folderPath;
        await plugin.saveSettings(MASTER_PLUGIN);
    }

    async function setVaultIdOnFolder(folderId: string, vaultId: string) {
        if(!password) {
            new Notice("Cannot set Drive folder to track this Vault")
            return false;
        }
        const token = await _getGoogleAccessToken(password);
        if(!token) {
            new Notice("Cannot set Drive folder to track this Vault")
            return false;
        }
        const {success, errorMessage} = await setDriveAppProperties(token, folderId, {
            vaultId: vaultId
        })

        if(!success) {
            new Notice(errorMessage)
            return false;
        }

        return true;
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

<ConfirmModal
    title="Folder is an active Vault"
    bind:open={adoptVaultModalOpen}
    onClose= {(yesNo) => {
        confirmedAsync?.resolve(yesNo)
    }}
>
    Select it only if you're sure that you own it. Confirm?
</ConfirmModal>

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
