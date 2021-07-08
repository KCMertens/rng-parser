// import formatXml from 'xml-formatter';
import stylesheet from '@/../xslt-test/rng-simplification-total.sef.json';
//@ts-ignore

export function simplify(xml: string): Promise<string> {
	const input = {
		stylesheetText: JSON.stringify(stylesheet),
		sourceText: xml,
		destination: 'serialized'
	};
	//@ts-ignore
	return SaxonJS.transform(input, 'serialized').then((r: any) => {
		// @ts-ignore
		console.log(r.principalResult);
		return r.principalResult;
	});
}

