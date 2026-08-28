import { type RefObject, useEffect } from "react";

const SPEED_PX_PER_FRAME = 2.5;
const SPEED_GROWTH_PER_BOUNCE = 1.05;
const MAX_SPEED_PX_PER_FRAME = 50;

/** Bounces the target element around the viewport, speeding up on every wall hit. */
export const useBouncingAnimation = ({
	targetRef,
	enabled,
	sizePx,
}: {
	targetRef: RefObject<HTMLElement | null>;
	enabled: boolean;
	sizePx: number;
}) => {
	useEffect(() => {
		const target = targetRef.current;
		if (!enabled || !target) return;

		let x = Math.random() * (window.innerWidth - sizePx);
		let y = Math.random() * (window.innerHeight - sizePx);
		let deltaX = Math.random() < 0.5 ? -SPEED_PX_PER_FRAME : SPEED_PX_PER_FRAME;
		let deltaY = Math.random() < 0.5 ? -SPEED_PX_PER_FRAME : SPEED_PX_PER_FRAME;
		let frame: number;

		const accelerate = (delta: number) => {
			const grown = delta * SPEED_GROWTH_PER_BOUNCE;
			return (
				Math.sign(grown) * Math.min(Math.abs(grown), MAX_SPEED_PX_PER_FRAME)
			);
		};

		const step = () => {
			const maxX = window.innerWidth - sizePx;
			const maxY = window.innerHeight - sizePx;
			x += deltaX;
			y += deltaY;
			if (x <= 0 || x >= maxX) {
				deltaX = accelerate(-deltaX);
				deltaY = accelerate(deltaY);
				x = Math.min(Math.max(x, 0), maxX);
			}
			if (y <= 0 || y >= maxY) {
				deltaX = accelerate(deltaX);
				deltaY = accelerate(-deltaY);
				y = Math.min(Math.max(y, 0), maxY);
			}
			target.style.transform = `translate(${x}px, ${y}px)`;
			frame = requestAnimationFrame(step);
		};
		frame = requestAnimationFrame(step);
		return () => cancelAnimationFrame(frame);
	}, [enabled, sizePx, targetRef]);
};
