import { useEffect, useRef, useState } from "react";

const AVATAR_URL = "https://github.com/TheUntraceable.png";
const AVATAR_SIZE_PX = 96;
const SPEED_PX_PER_FRAME = 2.5;
const SPEED_GROWTH_PER_BOUNCE = 1.05;
const MAX_SPEED_PX_PER_FRAME = 50;
const APPEARANCE_CHANCE = 0.01;

export function BouncingAvatarEasterEgg() {
	const [visible] = useState(
		() =>
			Math.random() < APPEARANCE_CHANCE &&
			!window.matchMedia("(prefers-reduced-motion: reduce)").matches,
	);
	const imageRef = useRef<HTMLImageElement>(null);

	useEffect(() => {
		if (!visible) return;
		const image = imageRef.current;
		if (!image) return;

		let x = Math.random() * (window.innerWidth - AVATAR_SIZE_PX);
		let y = Math.random() * (window.innerHeight - AVATAR_SIZE_PX);
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
			const maxX = window.innerWidth - AVATAR_SIZE_PX;
			const maxY = window.innerHeight - AVATAR_SIZE_PX;
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
			image.style.transform = `translate(${x}px, ${y}px)`;
			frame = requestAnimationFrame(step);
		};
		frame = requestAnimationFrame(step);
		return () => cancelAnimationFrame(frame);
	}, [visible]);

	if (!visible) return null;

	return (
		<img
			ref={imageRef}
			src={AVATAR_URL}
			alt=""
			aria-hidden="true"
			width={AVATAR_SIZE_PX}
			height={AVATAR_SIZE_PX}
			className="pointer-events-none fixed top-0 left-0 z-[9999] rounded-full opacity-50"
		/>
	);
}
