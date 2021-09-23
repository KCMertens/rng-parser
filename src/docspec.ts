import Xonomy, {XonomyAttributeDefinitionExternal, XonomyDocSpecExternal, XonomyElementDefinitionExternal} from '@kcmertens/xonomy';
import {Rng, RngAttribute, RngChildSpec, RngRef, isRef} from './rng-parser';

export function rngToDocspec(rng: Rng): XonomyDocSpecExternal {
	const spec = {
		elements: Object.entries(rng.elements).reduce<Record<string, XonomyElementDefinitionExternal>>((map, [id, def]) => {
			const allowText = def.children.some(c => c.allowText);
			map[id] = {
				attributes: def.attributes.reduce<Record<string, XonomyAttributeDefinitionExternal>>((map, attId) => {
					map[attId] = {
						menu: []
					}
					return map;
				}, {}),
				canDropTo: [],
				elementName() { return def.element },
				hasText() { return allowText },
				menu: [],
			}
			return map;
		}, {})
	}
	return spec;
}

const xml = Xonomy.xmlEscape;

function att(a: RngAttribute): string {
	return `${xml(a.name)}="${a.values.length === 1 ? xml(a.values[0]) : ''}"`; // leave value empty when there are multiple choices
}
function requiredAttributes(atts: RngAttribute[]): string {
	return atts.filter(a=>!a.optional).map(att).join(' ');
}

/** Assume parent is "and" */
function children(rng: Rng, c: RngChildSpec['children'], depth: number): string {
	if (depth > 10) return '';
	return c.flatMap(e => {
		if (isRef(e)) return !e.optional ? element(rng, e.id, depth) : '';
		// not a ref, but a child-clause, unpack it
		if (e.type === 'or') return ''; // user must choose, we cannot initialize here
		return children(rng, e.children, depth);
	}).join('')
}

// Generate the root node and all its required children (where non-ambiguos)
function element(rng: Rng, elementId: string, depth = 0): string {
	const el = rng.elements[elementId];
	return `<${el.element} ${requiredAttributes(el.attributes.map(id => rng.attributes[id]))}>
	${children(rng, el.children, depth+1)}
</${el.element}>`
}

export function initialDocument(rng: Rng): string {
	return element(rng, rng.root, 0);
}
