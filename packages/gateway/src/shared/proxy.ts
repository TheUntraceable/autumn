/**
 * Wraps `target` in a Proxy that serves `overrides` for matching properties
 * and forwards everything else, binding functions so class-based targets keep
 * their `this`.
 */
export const createForwardingProxy = <T extends object>(
	target: T,
	overrides: Record<PropertyKey, unknown>,
): T =>
	new Proxy(target, {
		get(proxied, property, receiver) {
			if (Object.hasOwn(overrides, property)) {
				return overrides[property];
			}
			const value: unknown = Reflect.get(proxied, property, receiver);
			return typeof value === "function" ? value.bind(proxied) : value;
		},
	});
