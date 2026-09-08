<script lang="ts">
	import { UserPasswordModal } from "rpg_shared/ui/custom";
	import { getAppContext } from "../context.svelte";
	import { getGoogleAccessToken, isGoogleAccessTokenExpired } from "../utils/driveSync/driveSession";

    export type AuthenticationProps = {
        title?: string,
        onAuthExecuted: (token: string) => void|Promise<void>,
        onAuthFailed: (error: string,  reason: "invalid_password" | "cannot_authenticate") => void,
        open: boolean
    }

    let {
        title = "Please provide your password",
        onAuthExecuted,
        onAuthFailed,
        open: pwdModalOpen = $bindable(false),
    }: AuthenticationProps = $props()

    const { plugin, settings } = getAppContext()

    const authExpired = $derived.by(() => {
        const expiresAt = settings.gdriveSettings.expiresAt;
        if(!expiresAt) return true
        const expired = isGoogleAccessTokenExpired(expiresAt)

        return expired;
    });

    async function authenticate(password?: string) {
        if(!password){
            return;
        } else {
            const result = await getGoogleAccessToken(password, authExpired, plugin)
            if(result.success){
                await onAuthExecuted(result.accessToken)
            }
            else {                
                onAuthFailed(result.error, result.reason)
            }
        }
    }

</script>


<UserPasswordModal
    {title}
    bind:open={pwdModalOpen}
    onCancel={() => {
        pwdModalOpen = false;
    }}
    onReturn={(v) => {
        pwdModalOpen = false;        
        authenticate(v);
    }}
/>
