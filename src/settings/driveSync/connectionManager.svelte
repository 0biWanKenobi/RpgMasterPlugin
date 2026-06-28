<script lang="ts">
    import { UserPasswordModal } from "rpg_shared/ui/userPasswordModal";
    import { type GoogleDriveTokenSet } from "rpg_shared/sync/googleDriveAuth";
    import { GoogleDriveConnectModal } from "rpg_shared/ui/custom";
    import { saveDriveTokens } from "./utilities";
	import RPGDungeonMasterPlugin from "../../rpgMasterMain";
	import { type PluginSettings } from "../../settings.svelte";
	import { onMount } from "svelte";
	import { MASTER_PLUGIN } from "../../capability";
	import {
        clearGoogleDriveSetupContext,
        createGoogleDriveSetupContext,
        decryptGoogleDrivePayload,
        GOOGLE_DRIVE_ACCESS_TOKEN_SECRET,
        GOOGLE_DRIVE_REFRESH_TOKEN_SECRET, 
		type GoogleDriveSetupContext
    } from "../../googleDriveProtocol";
	import { Notice } from "obsidian";
	import { HeaderWithIcon } from "rpg_shared/ui/custom";
	import { Button } from "rpg_shared/ui/base";
	import { SettingItem } from "rpg_shared/ui/obsidian";

    export type TokenSetup = "idle" | "inprogress" | "complete" | "pwdinput" | "error";
    export type TokenStatus = "set" | "unset";

    type RpgNexusConfiguration = {
        action: string,
        setup_id?: string,
        payload?: string,
    }

    type Props = {
        plugin: RPGDungeonMasterPlugin,
        pgsettings: PluginSettings,
        password?: string
    }


    let { plugin, pgsettings, password = $bindable() }: Props = $props();

    let tokenSetup = $state<TokenSetup>('idle')
    let tokenStatus = $state<TokenStatus>('unset')

    const app = $derived(() => plugin.app)
    
    const driveSetupCtx: GoogleDriveSetupContext = $state({
        setupId: "",
        authUrl: ""
    })

    let modalOpen = $state(false)
    let modalMsg = $state("")
    let modalIcon = $state("")
    const afterLoginButtons = $derived(tokenSetup == "complete")
    let loginInProgress = $state(false)


    const connectionState = $derived(
        tokenStatus == 'unset' ?    
        {
            icon: 'cloud-off',
            label: "Google Drive Not Configured",
        }:
        {
            icon: 'cloud',
            label: 'Google Drive Connected',
        }
    )

    $effect(() => {
        switch(tokenSetup){
            case "inprogress":
                modalOpen = true;
                modalMsg = "";
                modalIcon = "";
                return;
            case "idle":
            case "pwdinput":
                modalOpen = false;
                modalMsg = "";
                modalIcon = "";
                return;
            case "complete":
                modalOpen = true;
                modalMsg = "Operation completed, you can close this window.";
                modalIcon = "check-check";
                tokenStatus = "set";
                return;
            case "error":
                modalOpen = true;
                modalMsg = "Something went wrong, close this window and try again.";
                modalIcon = "circle-x";
                return;
        }
    });

    $effect(() => {
        switch(tokenSetup){
            case "complete": new Notice("Token saved"); return;
            case "error": new Notice("Error: token not saved"); return;
        } 
    });


    $effect(() => {
        tokenStatus = pgsettings.gdriveSettings.configured ? 'set' : 'unset'
    })

    onMount(() => {
        plugin.registerObsidianProtocolHandler("rpg_nexus_configuration", (params) => {
            void onTokenSetReceived(params as RpgNexusConfiguration);
        })

        return () => {
            modalOpen = false;
        }
    })

    

    async function onDisconnect() {
        app().secretStorage.deleteSecret(GOOGLE_DRIVE_ACCESS_TOKEN_SECRET);
        app().secretStorage.deleteSecret(GOOGLE_DRIVE_REFRESH_TOKEN_SECRET);
        pgsettings.gdriveSettings = {
            configured: false,
            folderId: '',
            folderPath: '',
            lastUpdated: new Date(),
            expiresAt: undefined
        }
        plugin.saveSettings(MASTER_PLUGIN)
        tokenStatus = 'unset';
    }

    async function onConnect() {
        tokenSetup = 'idle';
        tokenStatus = 'unset';

        const setupContext = createGoogleDriveSetupContext(
            app(),
            import.meta.env.VITE_GAUTH_URL,
        );

        driveSetupCtx.setupId = setupContext.setupId;
        driveSetupCtx.authUrl = setupContext.authUrl;
        
        tokenSetup = 'inprogress';
    }
    
    async function onModalClose (connectionCancelled: boolean) {
        if (connectionCancelled) {
            clearGoogleDriveSetupContext(app(), driveSetupCtx.setupId);
            new Notice("Setup cancelled")
        }
    
        await plugin.saveSettings(MASTER_PLUGIN);
        tokenStatus = pgsettings.gdriveSettings.configured? 'set' : 'unset';

    }



    async function getUserPassword() {
        const pwd = await new UserPasswordModal(app()).waitInput()
        if (pwd) password = pwd;
        return pwd;
    }

    async function _saveDriveTokens(password: string, tokenSet: GoogleDriveTokenSet) {
        await saveDriveTokens(password, tokenSet, plugin);
    }

    async function onTokenSetReceived(configuration: RpgNexusConfiguration) {
        loginInProgress = false;
        if (!configuration.setup_id || !configuration.payload) {
            tokenSetup = "error";
            new Notice("Google token payload missing from callback.")
            return;
        }

        tokenSetup = "pwdinput";
        password = await getUserPassword();

        if (!password) { //TODO: check length and complexity
            new Notice("No password set");
            tokenSetup = "error"
            return;
        }

        try {
            const tokenSet = await decryptGoogleDrivePayload(
                app(),
                configuration.setup_id,
                configuration.payload,
            );

            await _saveDriveTokens(
                password,
                tokenSet,
            );

            clearGoogleDriveSetupContext(app(), configuration.setup_id);
            await plugin.saveSettings(MASTER_PLUGIN);
            tokenSetup = "complete";
            new Notice("Google Drive connected")
        } 
        catch (error) {
            tokenSetup = "error";
            new Notice(
                error instanceof Error
                    ? `Google token decryption failed: ${error.message}`
                    : "Google token decryption failed.",
            )
        }
    }
</script>

<div class="connection-manager">
    <div id="testbtn"></div>
    <HeaderWithIcon icon={connectionState.icon} text={connectionState.label} />
    {#if tokenStatus == 'unset'}
        <Button icon="cloud" text="Connect" onClick={onConnect} />    
    {:else if tokenStatus == 'set'}
        <SettingItem name="Connection status" description="Connected">
            <Button icon="refresh-ccw" text="Reconnect" onClick={onConnect}/>
            <Button icon="log-out" tooltip="Disconnect" warning onClick={onDisconnect}/>
        </SettingItem>
    {/if}



    <GoogleDriveConnectModal
        bind:open={modalOpen}
        bind:loginInProgress
        {afterLoginButtons}
        authUrl={driveSetupCtx.authUrl}
        bind:statusMsg={modalMsg}
        bind:statusIcon={modalIcon}
        onClose={onModalClose}
    />

</div>

<style>

</style>
