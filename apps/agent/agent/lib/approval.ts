import type { Approval } from "eve/tools";
import { APP_AUTH } from "./app-auth";

export function isAutomated(session: {
	auth: {
		current?: {
			authenticator?: string;
			principalId?: string;
			principalType?: string;
		} | null;
	};
}): boolean {
	const auth = session.auth.current;
	return (
		auth?.authenticator === APP_AUTH.authenticator &&
		auth.principalId === APP_AUTH.principalId &&
		auth.principalType === APP_AUTH.principalType
	);
}

export function sensitiveWrite(instead: string): Approval {
	return ({ session }) =>
		isAutomated(session)
			? {
					type: "denied" as const,
					reason: `Not something to do unattended. ${instead}`,
				}
			: "user-approval";
}

export const HIGH_STAKES_SPONSORSHIP_THRESHOLDS = {
	amountInr: 200_000,
	exclusivityDays: 30,
} as const;

export function isHighStakesSponsorship(
	offeredAmountInr: number,
	exclusivityDays = 0,
): boolean {
	return (
		offeredAmountInr >= HIGH_STAKES_SPONSORSHIP_THRESHOLDS.amountInr ||
		exclusivityDays > HIGH_STAKES_SPONSORSHIP_THRESHOLDS.exclusivityDays
	);
}

export function sponsorshipApproval(
	offeredAmountInr: number,
	exclusivityDays = 0,
): Approval {
	return ({ session }) => {
		if (isHighStakesSponsorship(offeredAmountInr, exclusivityDays)) {
			return isAutomated(session)
				? {
						type: "denied" as const,
						reason: `High-stakes sponsorship decision (₹${offeredAmountInr} INR, ${exclusivityDays} days exclusivity) requires Human-in-the-Loop Host approval via ask_question or Slack.`,
					}
				: "user-approval";
		}
		return undefined;
	};
}
