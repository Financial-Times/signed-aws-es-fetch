const rewire = require('rewire');
const util = require('util');
const dns = require('dns');

let mainModule;
beforeEach(() => {
	jest.spyOn(util, 'promisify').mockImplementation((a) => a);
	jest.spyOn(dns, 'resolveCname').mockResolvedValue(['host1.com', 'host2.com']);
	mainModule = rewire('../main');
});

afterEach(() => {
	jest.restoreAllMocks();
});

describe('resolveUrlAndHost', () => {
	test(`the url host matchs /\.es\.amazonaws\.com$/ and it returned without modifications`, async () => {
		const url = 'http://ft.es.amazonaws.com/mypath';
		const result = await mainModule.__get__('resolveUrlAndHost')(url);
		expect(result).toBe(url);
	});
	test(`process.env.AWS_SIGNED_FETCH_DISABLE_DNS_RESOLUTION=true and the url is returned witout modifications`, async () => {
		const url = 'http://whatever.com/mypath';
		const env = mainModule.__get__('process.env');
		env.AWS_SIGNED_FETCH_DISABLE_DNS_RESOLUTION = true;
		const result = await mainModule.__get__('resolveUrlAndHost')(url);
		expect(result).toBe(url);
		delete env.AWS_SIGNED_FETCH_DISABLE_DNS_RESOLUTION;
	});
	test(`the url doesn't match and process.env.AWS_SIGNED_FETCH_DISABLE_DNS_RESOLUTION=false, 
	resolveCname is called and the first host returned is assigned to the url`, async () => {
		const url = 'http://whatever.com/mypath';
		const result = await mainModule.__get__('resolveUrlAndHost')(url);
		expect(result).toBe('http://host1.com/mypath');
	});
	test(`the url doesn't match and process.env.AWS_SIGNED_FETCH_DISABLE_DNS_RESOLUTION=false, 
	the url doesn't have the right format`, async () => {
		const url = 'whatever';
		const promise = mainModule.__get__('resolveUrlAndHost')(url);
		const error = new Error();
		error.code = 'ERR_INVALID_URL';
		error.input = url;
		await expect(promise).rejects.toEqual(error);
	});
	test(`the url doesn't match and process.env.AWS_SIGNED_FETCH_DISABLE_DNS_RESOLUTION=false, 
	the url doesn't exist`, async () => {
		dns.resolveCname.mockRestore();
		util.promisify.mockRestore();
		const url = 'http://whatever.zz';
		expect.assertions(1);
		await expect(mainModule.__get__('resolveUrlAndHost')(url)).rejects.toEqual(
			new Error('Invalid Host')
		);
	});
});

test('resolveValidHost resolve the canonical host', async () => {
	dns.resolveCname.mockRestore();
	util.promisify.mockRestore();
	const urlObject = new URL('http://gmail.google.com');
	const host = await rewire('../main').__get__('resolveValidHost')(urlObject);
	expect(host).toEqual('www3.l.google.com');
});

test('getEnv returns the first environment variable with value in the list', () => {
	// awsKeys: ['ES_AWS_ACCESS_KEY', 'AWS_ACCESS_KEY', 'AWS_ACCESS_KEY_ID']
	const env = mainModule.__get__('process.env');
    delete env.ES_AWS_ACCESS_KEY;
    delete env.AWS_ACCESS_KEY;
	env.AWS_ACCESS_KEY_ID = 'key3';
	expect(mainModule.__get__('getEnv')('awsKeys')).toBe('key3');
	delete env.AWS_ACCESS_KEY_ID;
	env.AWS_ACCESS_KEY = 'key2';
	expect(mainModule.__get__('getEnv')('awsKeys')).toBe('key2');
	delete env.AWS_ACCESS_KEY;
	env.ES_AWS_ACCESS_KEY = 'key1';
	expect(mainModule.__get__('getEnv')('awsKeys')).toBe('key1');
});
