// import formatXml from 'xml-formatter';
import stylesheet from '@/../xslt-test/rng-simplification-total.sef.json';
//@ts-ignore


export type rngElement = {
	id: string;
	element: string;
	attributes: string[];
	allowText: boolean;
	allowEmpty: boolean;
	allowedChildren: string[];
}

export type rngAttribute = {
	id: string; 
	name: string;
	values: string[];
	optional: boolean;
	pattern: string|null;
}

class AttributeCache {
	private cache: {[name: string]: rngAttribute[]} = {};
	private nextAttributeId = 0;

	public getId(name: string, optional: boolean, pattern: string|null, values: string[]) {
		const list = (this.cache[name] = (this.cache[name] || []));
		const foundAttribute = list.find(a => 
			a.name === name && 
			a.optional === optional &&
			a.pattern === pattern && 
			a.values.every((v, i) => v === values[i])
		);
		if (foundAttribute) return foundAttribute.id;

		const newAttribute = {
			name, optional, values, pattern,
			id: `${name}_${this.nextAttributeId++}`
		}

		list.push(newAttribute);
		return newAttribute.id;
	}

	public map(): {[id: string]: rngAttribute} {
		return Object.values(this.cache).flat().reduce((map, cur) => {
			map[cur.id] = cur;
			return map;
		}, {} as {[id: string]: rngAttribute})
	}
}

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

export function parseTree(doc: XMLDocument) {
	if (!doc) return null;

	const d = doc.documentElement;
	const cache = new AttributeCache();

	return {
		elements: [...d.querySelectorAll('define')].map(el => element(el, cache)).reduce((map, cur) => {
			map[cur.id] = cur;
			return map;
		}, {} as {[id: string]: rngElement}),
		attributes: cache.map(),
		root: root(d),
	}
}

export function root(ctx: Element): string {
	return ctx.querySelector('start ref')!.getAttribute('name')!;
}

export function element(ctx: Element, attributeCache: AttributeCache): rngElement {
	const defName = ctx.getAttribute('name')!;
	const elName = ctx.querySelector('name')!.textContent!;
	const attributes = [...ctx.querySelectorAll('attribute')].map(el => attribute(el, attributeCache));
	const allowText = ctx.querySelector('text') != null;
	const allowEmpty = ctx.querySelector('empty') != null;
	const allowedChildren = [...ctx.querySelectorAll('ref')].map(el => el.getAttribute('name')!);

	return {
		id: defName,
		element: elName,
		attributes,
		allowText,
		allowEmpty,
		allowedChildren
	};
}

export function attribute(ctx: Element, attributeCache: AttributeCache): any {
	const name = ctx.querySelector('name')!.textContent!;
	const optional = ctx.getAttribute('optional') != null;
	const values = [...ctx.querySelectorAll('value')].map(el => el.textContent!);
	const pattern = ctx.querySelector('param[name="pattern"]')?.textContent || null;
	return attributeCache.getId(name, optional, pattern, values);
}
