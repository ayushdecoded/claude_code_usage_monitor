/**
 * SSE Manager - Manages Server-Sent Events connections and broadcasts updates
 *
 * Uses native ReadableStream for SSE. Broadcasts minimal delta events (type + timestamp)
 * rather than full data payloads - clients re-fetch via API endpoints as needed.
 */

type SSEClient = {
	controller: ReadableStreamDefaultController;
	id: string;
};

type BroadcastEventData = {
	type: 'full' | 'projects' | 'history' | 'stats';
	timestamp: number;
} | {
	reason?: string;
	[key: string]: any;
};

class SSEManager {
	private clients = new Set<SSEClient>();
	private nextClientId = 1;

	/**
	 * Registers an SSE client and returns its ID
	 */
	addClient(controller: ReadableStreamDefaultController): string {
		const clientId = `client-${this.nextClientId++}`;
		const client: SSEClient = { controller, id: clientId };
		this.clients.add(client);

		console.log(`[SSE] Client ${clientId} connected (${this.clients.size} total)`);
		return clientId;
	}

	/**
	 * Removes a client from the manager
	 */
	removeClient(clientId: string): void {
		for (const client of this.clients) {
			if (client.id === clientId) {
				this.clients.delete(client);
				console.log(`[SSE] Client ${clientId} disconnected (${this.clients.size} remaining)`);
				return;
			}
		}
	}

	/**
	 * Broadcasts an event to all connected clients
	 */
	broadcast(eventName: string, data: BroadcastEventData): void {
		const deadClients: SSEClient[] = [];

		for (const client of this.clients) {
			try {
				this.sendToClient(client, eventName, data);
			} catch (error) {
				console.warn(`[SSE] Failed to send to client ${client.id}:`, error);
				deadClients.push(client);
			}
		}

		// Clean up dead connections
		for (const client of deadClients) {
			this.clients.delete(client);
		}

		if (this.clients.size > 0) {
			console.log(`[SSE] Broadcast '${eventName}' to ${this.clients.size} client(s)`);
		}
	}

	/**
	 * Sends an event to a specific client
	 */
	private sendToClient(client: SSEClient, eventName: string, data: any): void {
		const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
		client.controller.enqueue(new TextEncoder().encode(payload));
	}

	/**
	 * Returns the number of connected clients
	 */
	getClientCount(): number {
		return this.clients.size;
	}

	/**
	 * Closes all connections (for graceful shutdown)
	 */
	closeAll(): void {
		for (const client of this.clients) {
			try {
				client.controller.close();
			} catch {
				// Ignore errors on close
			}
		}
		this.clients.clear();
		console.log('[SSE] All clients disconnected');
	}
}

// Export singleton instance
export const sseManager = new SSEManager();
