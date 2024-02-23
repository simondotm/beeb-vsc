export interface MessageBase {
	command: string;
}

// Message from client to host
export const enum ClientCommand {
	EmulatorReady = 'emulatorReady',
	PageLoaded = 'pageLoaded',
}

// Message from host to client
export const enum HostCommand {
	LoadDisc = 'loadDisc',
}


export interface ClientMessage extends MessageBase {
	command: ClientCommand;
}

export interface HostMessage extends MessageBase {
	command: HostCommand;
	url?: string;
}