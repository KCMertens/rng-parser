/**
 * @jest-environment jsdom
 */


import {nameClass} from './parse';

const parser = new DOMParser();

const nameTests: Array<{doc: string, expect: ReturnType<typeof nameClass>}> = [{
	doc: `
	<attribute>
		<name ns="">
			sameAs
		</name>
		<data datatypeLibrary="http://www.w3.org/2001/XMLSchema-datatypes" type="anyURI"/>
	</attribute>`,
	expect: {
		any: false,
		blacklist: [],
		whitelist: ['sameAs']
	}
}, {
	doc: `
	<attribute>
      <anyName>
        <except>
          <name>test</name>
        </except>
      </anyName>
	</attribute>
	`,
	expect: {
		any: true,
		blacklist: ['test'],
		whitelist: []
	}
}];

nameTests.forEach(({doc: docString, expect: result}, i) => {
	const doc = parser.parseFromString(docString, 'text/xml').documentElement as Element; // get actual root of the parsed file instead of some meta-node thing
	test(i.toString(), () => {
		expect(nameClass(doc)).toStrictEqual(result);
	})
});