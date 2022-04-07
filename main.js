'use strict';

const aws4 = require('aws4');
const nodeFetch = require('node-fetch');
const urlParse = require('url').parse;
const resolveCname = require('util').promisify(require('dns').resolveCname);

module.exports = async function (url, opts, creds) {
	opts = opts || {};
	url = await resolveUrlAndHost(url);
	return signedFetch(url, opts, creds);
};

async function resolveUrlAndHost(url) {
	const urlObject = new URL(url);
	if (
		!/\.es\.amazonaws\.com$/.test(urlObject.host) &&
		!process.env.AWS_SIGNED_FETCH_DISABLE_DNS_RESOLUTION
	) {
		const hosts = await resolveCname(urlObject.host);
		url = url.replace(urlObject.host, hosts[0]);
	}
	return url;
}

function setAwsCredentials(creds){
	creds = creds || {};
	creds.accessKeyId =
		creds.accessKeyId ||
		process.env.ES_AWS_ACCESS_KEY ||
		process.env.AWS_ACCESS_KEY ||
		process.env.AWS_ACCESS_KEY_ID;
	creds.secretAccessKey =
		creds.secretAccessKey ||
		process.env.ES_AWS_SECRET_ACCESS_KEY ||
		process.env.AWS_SECRET_ACCESS_KEY;

	let sessionToken = creds.sessionToken;
	if (
		process.env.ES_AWS_SESSION_TOKEN !== false &&
		// a boolean value is interpreted as string if set from vault
		process.env.ES_AWS_SESSION_TOKEN !== 'false'
	) {
		sessionToken =
			sessionToken ||
			process.env.ES_AWS_SESSION_TOKEN ||
			process.env.AWS_SESSION_TOKEN;
	}
	if (sessionToken) {
		creds.sessionToken = sessionToken;
	}
	return creds;
}

function signedFetch(url, opts, creds) {
	creds = setAwsCredentials(creds);

	const urlObject = urlParse(url);
	const signable = {
		method: opts.method,
		host: urlObject.host,
		path: urlObject.path,
		body: opts.body,
		headers: opts.headers
	};
	aws4.sign(signable, creds);
	opts.headers = signable.headers;

	// Try to use a global fetch here if possible otherwise risk getting a handle
	// on the wrong fetch reference (ie. not a mocked one if in a unit test)
	return (global.fetch || nodeFetch)(
		`${urlObject.protocol}//${opts.headers.Host}${signable.path}`,
		opts
	);
}
