export const yieldToUI = async () => {
	await new Promise<void>(r => setTimeout(r, 0));
}
