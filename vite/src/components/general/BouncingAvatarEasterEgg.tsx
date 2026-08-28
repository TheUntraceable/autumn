import { useRef, useState } from "react";
import { useBouncingAnimation } from "@/hooks/useBouncingAnimation";

const AVATAR_URL = "https://github.com/TheUntraceable.png";
const AVATAR_SIZE_PX = 96;
const APPEARANCE_CHANCE = 0.01;

export function BouncingAvatarEasterEgg() {
	const [visible] = useState(
		() =>
			Math.random() < APPEARANCE_CHANCE &&
			!window.matchMedia("(prefers-reduced-motion: reduce)").matches,
	);
	const imageRef = useRef<HTMLImageElement>(null);

	useBouncingAnimation({
		targetRef: imageRef,
		enabled: visible,
		sizePx: AVATAR_SIZE_PX,
	});

	if (!visible) return null;

	return (
		<img
			ref={imageRef}
			src={AVATAR_URL}
			alt=""
			width={AVATAR_SIZE_PX}
			height={AVATAR_SIZE_PX}
			className="pointer-events-none fixed top-0 left-0 z-[9999] rounded-full opacity-50"
		/>
	);
}
