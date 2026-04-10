const stripLeadingNumbering = (value: string) => value.replace(/^\d+(?:\s*[./-]\s*\d+)*\s*/, "");

export const normalizeReportName = (value: string) =>
	value
		.toLowerCase()
		.replace(/[\u2013\u2014]/g, "-")
		.replace(/[^a-z0-9]+/g, " ")
		.trim();

export const matchesReportName = (actual: string, expected: string) => {
	const normalizedActual = normalizeReportName(actual);
	const normalizedExpected = normalizeReportName(expected);

	if (normalizedActual === normalizedExpected) {
		return true;
	}

	const actualNoNumber = normalizeReportName(stripLeadingNumbering(actual));
	const expectedNoNumber = normalizeReportName(stripLeadingNumbering(expected));

	return actualNoNumber === expectedNoNumber;
};