<script lang="ts">
    import { UserPasswordModal } from "rpg_shared/ui/custom";
    import { type GoogleDriveTokenSet } from "rpg_shared/sync/googleDriveAuth";
    import { GoogleDriveConnectModal } from "rpg_shared/ui/custom";
    import { saveDriveTokens } from "../../utils/driveSync/driveSession";
	import { onMount } from "svelte";
	import { MASTER_PLUGIN } from "../../utils/capability";
	import {
	    clearAuthentication,
        clearGoogleDriveSetupContext,
        createGoogleDriveSetupContext,
        decryptGoogleDrivePayload,
		type GoogleDriveSetupContext
    } from "../../utils/googleDriveProtocol";
	import { Notice } from "obsidian";
	import { HeaderWithIcon } from "rpg_shared/ui/custom";
	import { Button } from "rpg_shared/ui/base";
	import { SettingItem } from "rpg_shared/ui/obsidian";
	import { getAppContext } from "../../context.svelte";

    export type TokenSetup = "idle" | "inprogress" | "complete" | "pwdinput" | "error";
    export type TokenStatus = "set" | "unset";

    type RpgNexusConfiguration = {
        action: string,
        setup_id?: string,
        payload?: string,
    }

    type Props = {
        password?: string
    }

    let { password = $bindable() }: Props = $props();

    const {plugin, settings} = getAppContext()

    let tokenSetup = $state<TokenSetup>('idle')
    let tokenStatus = $state<TokenStatus>('unset')

    const app = $derived(plugin.app)
    
    const driveSetupCtx: GoogleDriveSetupContext = $state({
        setupId: "",
        authUrl: ""
    })

    let mounted = $state(true)
    let modalOpen = $derived(mounted && (tokenSetup == "inprogress" || tokenSetup == "complete" || tokenSetup == "error"))
    const modalUi = $derived.by(() => {
        switch(tokenSetup){
            case "complete": return {
                msg: "Operation completed, you can close this window.",
                icon: "check-check"
            }
            case "error": return {
                msg: "Something went wrong, close this window and try again.",
                icon: "circle-x"
            }
            default: return {
                msg: "",
                icon: ""
            }
        }
    })

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
            case "complete":
                tokenStatus = "set";
                new Notice("Token saved");
                return;
            case "error":
                new Notice("Error: token not saved");
                return;
        }
    });

    $effect(() => {
        tokenStatus = settings.gdriveSettings.configured ? 'set' : 'unset'
    })

    onMount(() => {
        plugin.registerObsidianProtocolHandler("rpg_nexus_configuration", (params) => {
            void onTokenSetReceived(params as RpgNexusConfiguration);
        })

        return () => {
            mounted = false;
        }
    })

    async function onDisconnect() {
        await clearAuthentication(plugin);
        tokenStatus = 'unset';
    }

    async function onConnect() {
        tokenSetup = 'idle';
        tokenStatus = 'unset';

        const setupContext = createGoogleDriveSetupContext(
            app,
            import.meta.env.VITE_GAUTH_URL,
        );

        driveSetupCtx.setupId = setupContext.setupId;
        driveSetupCtx.authUrl = setupContext.authUrl;
        
        tokenSetup = 'inprogress';
    }
    
    async function onModalClose (connectionCancelled: boolean) {
        if (connectionCancelled) {
            clearGoogleDriveSetupContext(app, driveSetupCtx.setupId);
            new Notice("Setup cancelled")
        }
    
        await plugin.saveSettings(MASTER_PLUGIN);
        tokenStatus = settings.gdriveSettings.configured? 'set' : 'unset';

    }

    let userPwdState = $state({
        open: false,
        ref: undefined as UserPasswordModal | undefined,
    })

    let pwdAsync = Promise.withResolvers<string|undefined>();

    async function getUserPassword() {
        userPwdState.open = true;
        const pwd = await pwdAsync.promise;
        if (pwd) password = pwd;
        userPwdState.open = false;
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
                app,
                configuration.setup_id,
                configuration.payload,
            );

            await _saveDriveTokens(
                password,
                tokenSet,
            );

            clearGoogleDriveSetupContext(app, configuration.setup_id);
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
        <div style="display: flex; align-items:center; column-gap: 5px;">
            <Button icon="cloud" text="Connect" onClick={onConnect} loading={tokenSetup != "idle"}/>
            {#if loginInProgress}
            <Button warning text="Cancel" onClick={() => {
                loginInProgress = false;
                tokenSetup = "idle"
            }}/>
            {/if}
        </div>
    {:else if tokenStatus == 'set'}
        <SettingItem name="Connection status" description="Connected">
            <Button icon="refresh-ccw" text="Reconnect" onClick={onConnect}/>
            <Button icon="log-out" tooltip="Disconnect" warning onClick={onDisconnect}/>
        </SettingItem>
    {/if}

    <GoogleDriveConnectModal
        bind:open={
            () => modalOpen,
            (v) => {
                tokenSetup = v ? "inprogress" : "idle"
            }
        }
        bind:loginInProgress
        {afterLoginButtons}
        authUrl={driveSetupCtx.authUrl}
        bind:statusMsg={modalUi.msg}
        bind:statusIcon={modalUi.icon}
        onClose={onModalClose}
    />

    <UserPasswordModal
        bind:this={userPwdState.ref}
        bind:open={userPwdState.open}
        title="Protect your account with a password"
        onReturn={(pwd) => {
            pwdAsync.resolve(pwd);
            pwdAsync = Promise.withResolvers<string|undefined>();
        }}
        onCancel={() => {
            pwdAsync.resolve(undefined);
            pwdAsync = Promise.withResolvers<string|undefined>();
        }}
    />

</div>

<style>

</style>
