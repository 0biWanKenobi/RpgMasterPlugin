<script lang="ts">
    import { UserPasswordModal } from "rpg_shared/ui/userPasswordModal";
    import { type GoogleDriveTokenSet } from "rpg_shared/sync/googleDriveAuth";
    import { GoogleDriveConnectModal } from "rpg_shared/sync/googleDriveConnectModal";
    import { saveDriveTokens } from "./utilities";
	import RPGDungeonMasterPlugin from "../../rpgMasterMain";
	import { PluginSettings } from "../../settings";
	import { onMount } from "svelte";
	import { MASTER_PLUGIN } from "../../capability";
	import { clearGoogleDriveSetupContext, createGoogleDriveSetupContext, decryptGoogleDrivePayload, GOOGLE_DRIVE_ACCESS_TOKEN_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN_SECRET } from "../../googleDriveProtocol";
	import { Notice } from "obsidian";

    export type TokenSetup = "idle" | "complete" | "pwdinput" | "error";
    export type TokenStatus = "set" | "unset";

    type RpgNexusConfiguration = {
        action: string,
        setup_id?: string,
        payload?: string,
    }

    type Props = {
        plugin: RPGDungeonMasterPlugin,
        pgsettings: PluginSettings,
        password: string | undefined
    }


    let { plugin, pgsettings, password }: Props = $props();

    let tokenSetup = $state<TokenSetup>('idle')
    let tokenStatus = $state<TokenStatus>('unset')

    const app = $derived(() => plugin.app)
    

    const modalUI = $derived(() => {
        switch(tokenSetup){
            case "idle":
            case "pwdinput": return {
                show: false,
                msg: "",
                icon: "",
                afterLoginButtons: false,
            } as const
            case "complete":return {
                show: true,
                msg: "Operation completed, you can close this window.",
                icon: "check-check",
                afterLoginButtons: true
            } as const;
            case "error": return {
                show: true,
                msg: "Something went wrong, close this window and try again.",
                icon: "circle-x",
                afterLoginButtons: false
            } as const;
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

        const gdriveAuthModal = new GoogleDriveConnectModal(app());
        const cancelled = gdriveAuthModal.openAsync(setupContext.authUrl);


        if (await cancelled) {
            clearGoogleDriveSetupContext(app(), setupContext.setupId);
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

