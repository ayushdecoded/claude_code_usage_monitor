import { sseManager } from '@/lib/server/sse-manager';

/**
 * GET /api/events
 * Server-Sent Events endpoint for real-time dashboard updates
 * Streams events when data changes (new activity, stats updates, etc.)
 */
export async function GET(request: Request): Promise<Response> {
	const stream = new ReadableStream({
		start(controller) {
			// Register this client with the SSE manager
			const clientId = sseManager.addClient(controller);

			// Send initial connection confirmation
			const encoder = new TextEncoder();
			const welcomeMessage = encoder.encode(
				`event: connected\ndata: ${JSON.stringify({ clientId, timestamp: Date.now() })}\n\n`
			);
			controller.enqueue(welcomeMessage);

			// Store clientId on controller for cleanup
			(controller as any).clientId = clientId;
		},

		cancel(controller) {
			// Client disconnected, clean up
			const clientId = (controller as any).clientId as string;
			if (clientId) {
				sseManager.removeClient(clientId);
			}
		}
	});

	// Return response with proper SSE headers
	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive'
		}
	});
}
