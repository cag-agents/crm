import { db } from "@crm/db";

const CSW_DURATION_MS = 24 * 60 * 60 * 1000;

export function calculateCswExpiry(lastInboundAt: Date): Date {
	return new Date(lastInboundAt.getTime() + CSW_DURATION_MS);
}

export function isCswActive(cswExpiresAt?: Date | string | null): boolean {
	if (!cswExpiresAt) {
		return false;
	}
	const expiry = new Date(cswExpiresAt);
	if (Number.isNaN(expiry.getTime())) {
		return false;
	}
	return expiry.getTime() > Date.now();
}

export async function checkConversationCsw(
	channelId: string,
	externalThreadId: string,
): Promise<{ isOpen: boolean; expiresAt?: Date; reason?: string }> {
	const conversation = await db.conversation.findUnique({
		where: {
			channelId_externalThreadId: {
				channelId,
				externalThreadId,
			},
		},
		select: {
			id: true,
			metadata: true,
		},
	});

	if (!conversation) {
		return {
			isOpen: false,
			reason: "Conversation not found",
		};
	}

	const meta = conversation.metadata as Record<string, unknown> | null;
	const rawExpiry = meta?.cswExpiresAt;

	if (typeof rawExpiry === "string" || rawExpiry instanceof Date) {
		const expiresAt = new Date(rawExpiry);
		if (
			!Number.isNaN(expiresAt.getTime()) &&
			expiresAt.getTime() > Date.now()
		) {
			return {
				isOpen: true,
				expiresAt,
			};
		}
	}

	const lastInbound = await db.message.findFirst({
		where: {
			conversationId: conversation.id,
			direction: "INBOUND",
		},
		orderBy: {
			sentAt: "desc",
		},
		select: {
			sentAt: true,
		},
	});

	if (!lastInbound) {
		return {
			isOpen: false,
			reason: "No inbound customer message recorded",
		};
	}

	const calculatedExpiry = calculateCswExpiry(lastInbound.sentAt);
	const isOpen = calculatedExpiry.getTime() > Date.now();

	return {
		isOpen,
		expiresAt: calculatedExpiry,
		reason: isOpen ? undefined : "24-hour Customer Service Window expired",
	};
}
