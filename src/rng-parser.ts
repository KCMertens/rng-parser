import '@/lib/saxon/SaxonJS2.rt.js'; // global saxonjs
import stylesheet from '@/../data/rng-simplification.sef.json';

export function simplify(xml: string): string {
	console.log('simplifying...');
	const input = {
		stylesheetInternal: stylesheet,
		sourceText: xml,
		destination: 'serialized',
	};
	//@ts-ignore
	const result = SaxonJS.transform(input, 'sync');
	//@ts-ignore
	return result.principalResult;
}

export function parseSimplifiedRNG(simplified: string): rng {
	const parser = new DOMParser();
	const parsedXml = parser.parseFromString(simplified, 'text/xml');
	
	const d = parsedXml.documentElement;

	const attributeCache = new AttributeCache();

	return {
		elements: [...d.querySelectorAll('define')].map(el => element(el, attributeCache)).reduce((map, cur) => {
			map[cur.id] = cur;
			return map;
		}, {} as {[id: string]: rngElement}),
		attributes: attributeCache.map(),
		root: root(d),
	}
}

export function rngToXema(rng: rng): Xema {
	function hasRef(e: rngChildSpec|ref): boolean { return isRef(e) || !!e.children.find(c => hasRef(c)); }

	var xema: Xema = {
		root: rng.root, 
		elements: {},
	};
	Object.values(rng.elements).forEach(e => {
		const objectEl: Xema['elements'][string] = {
			elementName: e.element,
			filling: 'txt',
			values: [], 
			// type xmlElementChild
			children: [],
			attributes: {}
		}; 
		let hasText = false;
		let hasChildElements = false;
		
		e.children.forEach(childGroup => {
			hasText = hasText || childGroup.allowText;
			hasChildElements = hasChildElements || hasRef(childGroup);
		});
		//select element type: inl=text+children, txt=text only, chd=children only
		objectEl.filling = hasText ? hasChildElements ? 'inl' : 'txt' : hasChildElements ? 'chd' : 'emp'; 
		//add allowed child elements, flattened, throw away choice and sequence
		const add = (c: rngChildSpec|ref): any => {
			if (!isRef(c)) c.children.forEach(add);
			else if (c.id !== e.id || c.optional) objectEl.children.push({ // don't add element as mandatory child of itself (inifinite loop!)
				min: c.optional ? 0 : 1,
				max: c.multiple ? 1 : null,
				name: c.id
			})
		}
		e.children.forEach(add);
		// add attributes for current element
		e.attributes.forEach(a => {
			const attDef = rng.attributes[a];
			objectEl.attributes[attDef.name] = {
				optionality: attDef.optional ? 'optional' : 'obligatory',
				filling: attDef.values.length ? 'lst' : 'txt',
				values: attDef.values.length ? attDef.values.map(v => ({
					value: v,
					caption: v
				})) : undefined
			}
		})
		xema.elements[e.id] = objectEl;
	});
	return xema;
}

// ----------------

export type ref = {
	id: string;
	optional: boolean;
	multiple: boolean;
}

export type rngChildSpec = {
	type: 'and'|'or';
	children: Array<ref|rngChildSpec>;
	allowText: boolean;
}

export type rngElement = {
	id: string;
	element: string;
	attributes: string[];
	children: rngChildSpec[];
}

export type rngAttribute = {
	id: string; 
	name: string;
	values: string[];
	optional: boolean;
	pattern: string|null;
}

export type rng = {
	root: string;
	elements: { [id: string]: rngElement },
	attributes: { [id: string]: rngAttribute; }
}

export type Xema = {
	root: string;
	elements: {
		[id: string]: {
			elementName: string;
			// inl=text+children, txt=text only, chd=children only
			filling: 'inl'|'txt'|'chd'|'emp';
			values: string[];
			children: Array<{min: number, max: number|null, name: string}>;
			attributes: {
				[id: string]: {
					optionality: 'optional'|'obligatory';
					filling: 'txt'|'lst'; // whether to use value list?
					values?: Array<{
						value: string;
						caption: string;
					}>
				}
			}
		}
	}
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

const children = (parent: Element, querySelector: string) => [...parent.querySelectorAll(querySelector)].filter(match => match.parentElement === parent);
const child = (parent: Element, querySelector: string) => children(parent, querySelector)[0] || null;
function isRef(e: any): e is ref { return e && e.id && !e.children; }

function root(ctx: Element): string {
	return ctx.querySelector('start ref')!.getAttribute('name')!;
}
function element(ctx: Element, cache: AttributeCache): rngElement {
	const defName = ctx.getAttribute('name')!;
	ctx = child(ctx, 'element');
	const elName = child(ctx, 'name')!.textContent!;
	
	const s: any = {};

	const r: rngElement = {
		id: defName,
		attributes: [...ctx.querySelectorAll('attribute')].map(el => attribute(el, cache)),
		element: elName,
		children: children(ctx, 'group, choice').map<rngChildSpec>(e => {
			switch (e.tagName) {
				case 'group': return _group(e);
				case 'choice': return _choice(e);
				default: throw new Error(`Unexpected element ${e.tagName}`);
			}
		}),
	}

	return r;
}

function _group(ctx: Element): rngChildSpec {
	const r: rngChildSpec = {
		type: 'and',
		allowText: false, 
		children: []
	};

	const stack = [...ctx.children];
	let c: Element|undefined;
	while ((c = stack.shift()) != null) {
		switch (c.tagName) {
			case 'choice': r.children.push(_choice(c)); continue;
			case 'group': stack.push(...c.children); continue;
			case 'attribute': continue; // parsed separately
			case 'empty': continue; // empty as a child of group is meaningless.
			case 'text': r.allowText = true; continue;
			case 'ref': r.children.push({id: c.getAttribute('name')!, optional: c.hasAttribute('optional'), multiple: c.hasAttribute('multiple')}); continue;
			default: console.warn(`unexpected element ${c.tagName} in <group> for element ${ctx.closest('define')!.getAttribute('name')!}`); continue;
		}
	}

	return r;
}

function _choice(ctx: Element): rngChildSpec {
	const r: rngChildSpec = {
		type: 'or',
		allowText: false, 
		children: []
	};

	const stack = [...ctx.children];
	let c: Element|undefined;
	while ((c = stack.shift()) != null) {
		switch (c.tagName) {
			case 'choice': stack.push(...c.children); continue;
			case 'group': r.children.push(_group(c)); continue;
			case 'attribute': continue; // parsed separately
			case 'empty': continue; // empty as a child of group is meaningless.
			case 'text': r.allowText = true; continue;
			case 'ref': r.children.push({id: c.getAttribute('name')!, optional: c.hasAttribute('optional'), multiple: c.hasAttribute('multiple')}); continue;
			default: console.warn(`unexpected element ${c.tagName} in <choice> for element ${ctx.closest('define')!.getAttribute('name')!}`); continue;
		}
	}

	return r;
}

function attribute(ctx: Element, cache: AttributeCache): string {
	const name = ctx.getAttribute('name')!;
	const optional = ctx.hasAttribute('optional');
	const pattern = ctx.querySelector('param[name="pattern"]')?.textContent || null;
	const values = children(ctx, 'value').map(el => el.textContent!);

	return cache.getId(name, optional, pattern, values);
}