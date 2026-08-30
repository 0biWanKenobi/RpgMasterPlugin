<script lang="ts">
	import { Button, Dropdown, Input } from "rpg_shared/ui/base";
	import { SettingItem, SettingItemGroup } from "rpg_shared/ui/obsidian";
	import { getAppContext } from "../context.svelte";
	import { MASTER_PLUGIN } from "../utils/capability";
	import { startFrameMonitor, waitForAnimationFrame } from "./perfMeasure";
	import { type WorkerCommand, nobleHash, fetchAndHashWholeFile } from "rpg_shared/hash";
	
    type FrameMonitor = ReturnType<typeof startFrameMonitor>;
    type FrameStats = ReturnType<FrameMonitor['stop']>


    const { plugin } = getAppContext()

    let command = $state<string>('')
    const disabled = $derived(!command)

    function executeCommand() {
        if(command == '') return;
        plugin.runDbTest(MASTER_PLUGIN, command)
    }


    let sizeOption = $state("256m")
    const hashDisabled = $derived(!sizeOption)

    let testMode = $state<WorkerCommand>()

    // const path = $derived(`.hash-tests/hash-test-${sizeOption}.bin`)
    const path = $derived(`Campaigns/blue-marble.jpg`)

    async function executeShaTest(){

        if(!testMode) return;
        const frameMonitor = startFrameMonitor();
        let hashval: string | undefined = undefined;
        let frameStats: FrameStats | undefined = undefined;
        
        if(testMode.type == "noble")
            try {
                const result = await nobleHash(testMode.url);
                hashval = result.hash
            } catch (error) {
                await waitForAnimationFrame();
                console.error(error)
            }
            finally{
                await waitForAnimationFrame();
                frameStats = frameMonitor.stop();
            }
        if(testMode.type == "wholefile")
            try {
                const result = await fetchAndHashWholeFile(testMode.url)
                hashval = result.hash
            } catch (error) {
                await waitForAnimationFrame();
                console.error(error)
            }
            finally{
                await waitForAnimationFrame();
                frameStats = frameMonitor.stop();
            }

        frameStats ??= frameMonitor.stop();
        console.log("computed hash is", hashval)
        console.log(frameStats)
    }


    async function runEmpty(){
        const monitor = startFrameMonitor();

        await new Promise(resolve => setTimeout(resolve, 6_000));
        await waitForAnimationFrame();

        console.log(monitor.stop());
    }
</script>

<SettingItemGroup>
    <SettingItem name="command">
        <Input type="text" value={command} onChange={v => {
            command = v
        }} />    
    </SettingItem>
    <SettingItem>
        <Button text="Execute Db Command" {disabled} onClick={executeCommand}/>
    </SettingItem>
</SettingItemGroup>

<SettingItemGroup>
    <SettingItem name="File size">
        <Dropdown
        value={sizeOption}
        options={[
            {text: "256m", value: "256m"}
        ]}
        onChange={v => {
            sizeOption = v;
        }}
        >    
        </Dropdown>
    </SettingItem>
    <SettingItem name="Test mode">
        <Dropdown
        value={testMode}
        options={[
            {text: "Noble", value: {
                type: "noble",
                url: plugin.app.vault.adapter.getResourcePath(path),
            }},
            {text: "Wholefile", value :{
                type: "wholefile",
                url: plugin.app.vault.adapter.getResourcePath(path),
            }},
        ] satisfies {text: string, value: WorkerCommand}[]}
        onChange={v => {
            testMode = v;
        }}
        >    
        </Dropdown>
    </SettingItem>
    <SettingItem>
        <Button text="Test hashing" disabled={hashDisabled} onClick={executeShaTest}/>
        <Button text="Run empty" onClick={() => {
            runEmpty()
        }}/>

    </SettingItem>
</SettingItemGroup>