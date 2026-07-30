import { BillingInterval, type IntervalConfig } from "@autumn/shared";
import { UTCDate } from "@date-fns/utc";
import {
	addMonths,
	addWeeks,
	differenceInSeconds,
	getDate,
	getHours,
	getMinutes,
	getSeconds,
	getTime,
	setDate,
	setHours,
	setMinutes,
	setSeconds,
	startOfMonth,
	subMonths,
	subWeeks,
} from "date-fns";
import { formatUnixToDateTime } from "@/utils/genUtils.js";

/** Months covered by one unit of each month-based billing interval */
const MONTHS_PER_INTERVAL: Partial<Record<BillingInterval, number>> = {
	[BillingInterval.Month]: 1,
	[BillingInterval.Quarter]: 3,
	[BillingInterval.SemiAnnual]: 6,
	[BillingInterval.Year]: 12,
};

const monthsForInterval = ({ interval }: { interval: BillingInterval }) => {
	const months = MONTHS_PER_INTERVAL[interval];
	if (months === undefined) {
		throw new Error(`Invalid billing interval: ${interval}`);
	}
	return months;
};

const subtractBillingIntervalUnix = ({
	unixTimestamp,
	interval,
	intervalCount = 1,
}: {
	unixTimestamp: number;
	interval: BillingInterval;
	intervalCount: number;
}) => {
	const date = new UTCDate(unixTimestamp);

	if (interval === BillingInterval.Week) {
		return subWeeks(date, intervalCount).getTime();
	}

	return subMonths(
		date,
		monthsForInterval({ interval }) * intervalCount,
	).getTime();
};

const addBillingIntervalUnix = ({
	unixTimestamp,
	interval,
	intervalCount = 1,
}: {
	unixTimestamp: number;
	interval?: BillingInterval;
	intervalCount?: number;
}) => {
	if (!interval || !intervalCount) {
		return unixTimestamp;
	}

	const date = new UTCDate(unixTimestamp);

	if (interval === BillingInterval.Week) {
		return addWeeks(date, intervalCount).getTime();
	}

	return addMonths(
		date,
		monthsForInterval({ interval }) * intervalCount,
	).getTime();
};

export const getNextStartOfMonthUnix = ({
	interval,
	intervalCount,
}: {
	interval: BillingInterval;
	intervalCount: number;
}) => {
	const nextBillingCycle = addIntervalForProration({
		unixTimestamp: Date.now(),
		intervalConfig: {
			interval,
			intervalCount,
		},
	});

	// Subtract till it hits first
	const date = new UTCDate(nextBillingCycle);
	const firstDayOfMonth = startOfMonth(date);
	const twelveOClock = setHours(firstDayOfMonth, 12);

	return twelveOClock.getTime();
};

const getAlignedIntervalUnix = ({
	alignWithUnix,
	interval,
	intervalCount,
	now,
	alwaysReturn,
}: {
	alignWithUnix: number;
	interval: BillingInterval;
	intervalCount: number;
	now?: number;
	alwaysReturn?: boolean;
}) => {
	// alignWithUnix = addSeconds(alignWithUnix, 20).getTime();

	let nextCycleAnchorUnix = alignWithUnix;

	now = now || Date.now();

	const naturalBillingDate = addIntervalForProration({
		unixTimestamp: now,
		intervalConfig: {
			interval,
			intervalCount,
		},
	});

	const maxIterations = 10000;
	let iterations = 0;

	const printLogs = false;
	if (printLogs) {
		console.log(
			"Natural billing date:",
			formatUnixToDateTime(naturalBillingDate),
		);
		console.log(
			"Next cycle anchor unix:",
			formatUnixToDateTime(nextCycleAnchorUnix),
		);
	}

	while (true) {
		const subtractedUnix = subtractBillingIntervalUnix({
			unixTimestamp: nextCycleAnchorUnix,
			interval,
			intervalCount,
		});

		if (printLogs) {
			console.log("Subtracted unix:", formatUnixToDateTime(subtractedUnix));
		}

		if (subtractedUnix <= now) {
			break;
		}

		nextCycleAnchorUnix = subtractedUnix;

		iterations++;
		if (iterations > maxIterations) {
			throw new Error("Max iterations reached");
		}
	}

	let billingCycleAnchorUnix: number | undefined = nextCycleAnchorUnix;

	if (printLogs) {
		console.log(
			"Next cycle anchor:",
			formatUnixToDateTime(nextCycleAnchorUnix),
		);
		console.log("Now:", formatUnixToDateTime(now));
		console.log("--------------------------------");
	}

	const anchorAndNaturalDiff = differenceInSeconds(
		naturalBillingDate,
		nextCycleAnchorUnix,
	);

	// For insurance, also means you can't set billing cycle anchor to a minute in the future...
	const anchorAndNowDiff = Math.abs(
		differenceInSeconds(now, nextCycleAnchorUnix),
	);

	if (anchorAndNaturalDiff < 60 || anchorAndNowDiff < 20) {
		if (alwaysReturn) {
			return naturalBillingDate;
		} else {
			billingCycleAnchorUnix = undefined;
		}
	}

	return billingCycleAnchorUnix;
};

const subtractFromUnixTillAligned = ({
	targetUnix,
	originalUnix,
}: {
	targetUnix: number;
	originalUnix: number;
}) => {
	const targetDate = new UTCDate(targetUnix);
	const originalDate = new UTCDate(originalUnix);

	// Get target date components
	const targetDay = getDate(targetDate);
	const targetHours = getHours(targetDate);
	const targetMinutes = getMinutes(targetDate);
	const targetSeconds = getSeconds(targetDate);
	const originalDay = getDate(originalDate);

	// Create aligned date using date-fns functions
	let alignedDate = originalDate;

	// If target day is greater than original day, subtract a month
	if (targetDay > originalDay) {
		alignedDate = subMonths(alignedDate, 1);
	}

	// Calculate last day of the month to handle month length differences
	const lastDayOfMonth = new UTCDate(
		alignedDate.getFullYear(),
		alignedDate.getMonth() + 1,
		0,
	).getDate();

	// Apply target day (capped to last day of month) and time components
	alignedDate = setDate(alignedDate, Math.min(targetDay, lastDayOfMonth));
	alignedDate = setHours(alignedDate, targetHours);
	alignedDate = setMinutes(alignedDate, targetMinutes);
	alignedDate = setSeconds(alignedDate, targetSeconds);

	return getTime(alignedDate);
};

// Shifts the anchor by whole months, keeping its day-of-month (clamped to the
// target month's length) and time-of-day, which is how Stripe anchors cycles:
// Sep 30 anchor -> Oct 30, Feb 28/29
const shiftAnchorByMonths = ({
	anchorDate,
	months,
}: {
	anchorDate: UTCDate;
	months: number;
}) => {
	const anchorDay = getDate(anchorDate);
	const shifted = new UTCDate(addMonths(anchorDate, months).getTime());

	const lastDayOfTargetMonth = new UTCDate(
		shifted.getFullYear(),
		shifted.getMonth() + 1,
		0,
	).getDate();

	let aligned = new UTCDate(
		setDate(shifted, Math.min(anchorDay, lastDayOfTargetMonth)).getTime(),
	);
	aligned = new UTCDate(setHours(aligned, getHours(anchorDate)).getTime());
	aligned = new UTCDate(setMinutes(aligned, getMinutes(anchorDate)).getTime());
	aligned = new UTCDate(setSeconds(aligned, getSeconds(anchorDate)).getTime());

	return getTime(aligned);
};

// Subtracts an interval from a period end, preserving anchor-based end-of-month behavior
// Uses the anchor date (unixTimestamp) to determine if end-of-month logic should apply
// e.g. Sep 30 anchor -> Aug 30, Jul 30, Feb 28/29 (follows Stripe behavior)
export const subtractIntervalForProration = ({
	unixTimestamp,
	interval,
	intervalCount = 1,
}: {
	unixTimestamp: number;
	interval: BillingInterval;
	intervalCount?: number;
}) => {
	const anchorDate = new UTCDate(unixTimestamp);

	if (interval === BillingInterval.Week) {
		return getTime(new UTCDate(subWeeks(anchorDate, intervalCount).getTime()));
	}

	return shiftAnchorByMonths({
		anchorDate,
		months: -monthsForInterval({ interval }) * intervalCount,
	});
};

// Adds an interval to a period start, preserving anchor-based end-of-month behavior
// Uses the anchor date (unixTimestamp) to determine if end-of-month logic should apply
// e.g. Sep 30 anchor -> Oct 30, Nov 30, Feb 28/29 (follows Stripe behavior)
export const addIntervalForProration = ({
	unixTimestamp,
	intervalConfig,
}: {
	unixTimestamp: number;
	intervalConfig: IntervalConfig;
}) => {
	if (!intervalConfig) return unixTimestamp;
	const { interval } = intervalConfig;
	const intervalCount = intervalConfig.intervalCount ?? 1;
	const anchorDate = new UTCDate(unixTimestamp);

	if (interval === BillingInterval.Week) {
		return getTime(new UTCDate(addWeeks(anchorDate, intervalCount).getTime()));
	}

	return shiftAnchorByMonths({
		anchorDate,
		months: monthsForInterval({ interval }) * intervalCount,
	});
};
