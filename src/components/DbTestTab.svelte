<script lang="ts">
	import { Button, Input } from "rpg_shared/ui/base";
	import { SettingItem } from "rpg_shared/ui/obsidian";
	import { getAppContext } from "../context.svelte";
	import { MASTER_PLUGIN } from "../utils/capability";


    const { plugin } = getAppContext()

    let command = $state<string>('')
    const disabled = $derived(!command)

    function executeCommand() {
        if(command == '') return;
        plugin.runDbTest(MASTER_PLUGIN, command)
    }
</script>

<SettingItem>
    <Input type="text" value={command} onChange={v => {
        command = v
    }} />
    <Button text="Execute Db Command" {disabled} onClick={executeCommand}/>
</SettingItem>