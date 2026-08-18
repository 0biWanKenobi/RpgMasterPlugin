import type { Action } from "svelte/action";

interface LongpressAttributes {
	onlongpress?: (event: CustomEvent<MouseEvent>) => void;
}

export const longpress: Action<
	HTMLElement,
	number | undefined,
	LongpressAttributes
> = (node, threshold = 500) => {
	const eventWindow = activeWindow;
	let activePointerId: number | undefined;
	let thresholdPassed = false;
	let thresholdTimer: number | undefined;

	const consumeEvent = (event: Event) => {
		event.preventDefault();
		event.stopImmediatePropagation();
	};

	const consumeClick = (event: MouseEvent) => {
		consumeEvent(event);
	};

	const disarmClickSwallower = () => {
		eventWindow.removeEventListener("click", consumeClick, true);
	};

	const clearThresholdTimer = () => {
		if (thresholdTimer === undefined) return;
		eventWindow.clearTimeout(thresholdTimer);
		thresholdTimer = undefined;
	};

	const removeGestureListeners = () => {
		eventWindow.removeEventListener("pointermove", handlePointerMove, true);
		eventWindow.removeEventListener("pointerup", handlePointerUp, true);
		eventWindow.removeEventListener("pointercancel", handlePointerCancel, true);
	};

	const finishGesture = () => {
		clearThresholdTimer();
		removeGestureListeners();
		activePointerId = undefined;
	};

	function handlePointerMove(event: PointerEvent) {
		if (event.pointerId !== activePointerId || thresholdPassed) return;
		finishGesture();
	}

	function handlePointerUp(event: PointerEvent) {
		if (event.pointerId !== activePointerId) return;

		const shouldConsumeRelease = thresholdPassed;
		finishGesture();
		thresholdPassed = false;

		if (!shouldConsumeRelease) return;
		consumeEvent(event);

		// A click normally follows pointerup and removes the one-shot listener.
		// If the browser suppresses that click, avoid consuming a later click.
		eventWindow.setTimeout(disarmClickSwallower, 0);
	}

	function handlePointerCancel(event: PointerEvent) {
		if (event.pointerId !== activePointerId) return;
		finishGesture();
		thresholdPassed = false;
		disarmClickSwallower();
	}

	const handlePointerDown = (event: PointerEvent) => {
		if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;

		finishGesture();
		disarmClickSwallower();
		activePointerId = event.pointerId;
		thresholdPassed = false;
		eventWindow.addEventListener("pointermove", handlePointerMove, true);
		eventWindow.addEventListener("pointerup", handlePointerUp, true);
		eventWindow.addEventListener("pointercancel", handlePointerCancel, true);

		thresholdTimer = eventWindow.setTimeout(() => {
			thresholdTimer = undefined;
			thresholdPassed = true;
			eventWindow.addEventListener("click", consumeClick, {
				capture: true,
				once: true
			});
			node.dispatchEvent(
				new CustomEvent<MouseEvent>("longpress", { detail: event })
			);
		}, threshold);
	};

	node.addEventListener("pointerdown", handlePointerDown);

	return {
		destroy() {
			node.removeEventListener("pointerdown", handlePointerDown);
			finishGesture();
			disarmClickSwallower();
		}
	};
};
