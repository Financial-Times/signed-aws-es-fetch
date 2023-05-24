const signedFetch = require("../main");
const https = require("https");
const { expect, test } = require("@jest/globals");

const keepAliveAgent = new https.Agent({ keepAlive: true });
const DEFAULTS = {
	query: { match_all: {} },
	from: 0,
	size: 10,
	sort: { publishedDate: "desc" },
	_source: true,
};

test("Verify the request is signed sucessfully", async () => {
	const body = JSON.stringify(DEFAULTS);
	const timeout = 3000;

	const result = await signedFetch(
		"https://next-elasticsearch-v7.gslb.ft.com/content/_search",
		{
			body,
			agent: keepAliveAgent,
			timeout,
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
		}
	);

	expect(result.ok).toBe(true);
	expect(result.status).toBe(200);
	expect(result.statusText).toBe("OK");
});
