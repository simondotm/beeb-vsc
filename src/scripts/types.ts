import type { Emulator } from './emulator';

declare global {
    interface Window {
			theEmulator: Emulator | undefined;
			JSBEEB_RESOURCES: Record<string, string>
			JSBEEB_DISC?: string
		}
}
