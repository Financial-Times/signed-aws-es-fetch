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
});
