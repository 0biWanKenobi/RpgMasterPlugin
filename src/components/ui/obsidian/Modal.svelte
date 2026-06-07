<script lang="ts">
	import { Portal } from "@jsrob/svelte-portal";
	import Icon from "../base/Icon.svelte";

	type Props = {
		title?: string;
		children?: any;
		portalTarget?: HTMLElement;
		open?: boolean;
	};

	let {
		title = "",
		children,
		open = $bindable(false),
	}: Props = $props();

	const closeModal = () => {
		open = false;
	};

    const portalTarget = document.querySelector(".modal.mod-settings")?.parentElement!
</script>

<Portal target={portalTarget ?? document.body}>
	{#if open}
		<div class="modal-container mod-dim">
			<div class="modal-bg" style="opacity: 0.85;"></div>
			<div class="modal">
				<div class="modal-close-button mod-raised clickable-icon">
					<span role="button" tabindex="0" onkeypress={null} onclick={closeModal} style="display: contents;">
						<Icon icon="x" />
					</span>
				</div>
				<div class="modal-header">
					<div class="modal-title">{title}</div>
				</div>
				<div class="modal-content">
					{@render children?.()}
				</div>
			</div>
		</div>
	{/if}
</Portal>
