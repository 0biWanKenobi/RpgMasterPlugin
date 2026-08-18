<script lang="ts">
	import { onMount } from "svelte";
	import type { PluginSettings } from "../interfaces";


    type Props = {
        settings: PluginSettings
    }

	const { settings }:Props = $props();

	let styleEl: HTMLStyleElement | undefined;

	const css = $derived.by(() => {
		const root = settings.campaign.rootFolder;
		const campaigns = settings.campaign.list.map( c => c.vaultPath)

		if (!root || campaigns.length === 0) {
			return "";
		}

		const selectors = campaigns
			.filter(
				(path) =>
					path !== root &&
					path.startsWith(`${root}/`)
			)
			.map(
				(path) =>
					`.nav-folder-title[data-path=${CSS.escape(path)}]::after`
			)
			.join(",\n");

		if (!selectors) {
			return "";
		}

		return `
			${selectors} {
				content: "Campaign";
				margin-inline-start: 0.5em;
				padding: 1px 5px;

				font-size: 0.75em;
				font-weight: 500;
				line-height: 1.3;

				color: var(--text-accent);
				background-color: var(--background-modifier-hover);

				border-radius: var(--radius-s);
			}
		`;
	});

	onMount(() => {
		styleEl = document.createElement("style");
		styleEl.dataset.rpgCampaignDecorations = "";

		document.head.appendChild(styleEl);

		return () => {
			styleEl?.remove();
		};
	});

	$effect(() => {
		if (styleEl) {
			styleEl.textContent = css;
		}
	});
</script>