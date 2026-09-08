<script lang="ts">
	import { Button, Input } from "rpg_shared/ui/base";
	import { SettingItem, SettingItemGroup } from "rpg_shared/ui/obsidian";
	import { syncEngine } from "rpg_shared/sync/engine";
	import { Notice } from "rpg_shared/ui/custom";
	import Authentication from "./Authentication.svelte";

    let folderId = $state<string>('0B45xvM6k0h_nZ2d2SzRqUWU0MkE')//settings.gdriveSettings.folderId)
    let pageSize = $state<number|null>(100)


    let pwdModalOpen = $state(false)
    let tokenAsync = $state(Promise.withResolvers<string|undefined>())
    let accessToken = "";
    
  //0B45xvM6k0h_nZ2d2SzRqUWU0MkE
    async function scanFolders(token: string){
        try {
			const v = await syncEngine.getRemoteSnapshot({
				accessToken: token,
				folderId: folderId,
				pageSize: pageSize ?? 100
			});
			return console.log(v);
		} catch (err) {
			console.error('Cloud folder scan exception:', err);
			return {
				success: false as const,
				error: err instanceof Error ? err.message : String(err),
				errorMessage: 'Error scanning remote Vault'
			};
		}
    }

    const disabled = $derived(!folderId || (pageSize ?? 0) <= 0)

    async function executeCommand() {

        if(!accessToken) {
            pwdModalOpen = true;
            accessToken = await tokenAsync.promise ?? "";
            if(!accessToken) return;
        }

        scanFolders(accessToken);
    }


</script>

<SettingItemGroup>
    <SettingItem name="Cloud item">
        <Input type="text" value={folderId} onChange={v => {
            folderId = v
        }} />    
    </SettingItem>
    <SettingItem name="Page size">
        <Input type="number" value={String(pageSize)} onChange={v => {
            pageSize = parseInt(v) || 2
        }} />    
    </SettingItem>
    <SettingItem>
        <Button text="Execute Api Call" {disabled} onClick={executeCommand}/>
    </SettingItem>
</SettingItemGroup>


<Authentication
    title="Please provide your Password"
    bind:open={pwdModalOpen}
    onAuthFailed={(error) => {
        pwdModalOpen = false;
        tokenAsync.resolve(undefined);
        Notice.Warning(error)
        tokenAsync = Promise.withResolvers<string|undefined>();
    }}
    onAuthExecuted={(v) => {
        pwdModalOpen = false;
        tokenAsync.resolve(v);
        tokenAsync = Promise.withResolvers<string|undefined>();
    }}
/>
