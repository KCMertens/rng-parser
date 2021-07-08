// import formatXml from 'xml-formatter';
import stylesheet from '@/../xslt-test/rng-simplification-total.xsl';

const parser = new DOMParser();
const proc = new XSLTProcessor();
try {
	proc.importStylesheet(parser.parseFromString(stylesheet, 'text/xml'));
} catch (e) {
	console.error('failed to import stylesheet');
	console.error(e);
	console.log(stylesheet);
}

export function simplify(xml: string): string {
	const serializer = new XMLSerializer();

	const doc = parser.parseFromString(xml, 'application/xml');
	console.log(doc);


	const simplified = proc.transformToDocument(doc);
	debugger;
	return serializer.serializeToString(simplified);
}

