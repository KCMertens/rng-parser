import Xonomy, {XonomyAttributeDefinitionExternal, XonomyDocSpecExternal, XonomyElementDefinitionExternal} from '@kcmertens/xonomy';
import {Rng, RngAttribute} from './rng-parser';

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
				elementName() { debugger; return def.element },
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
	return atts.filter(a=>!a.optional).map(att);
}


// Generate the root node and all its required children (where non-ambiguos)
export function initialElement(rng: Rng): string {
	return `<${rng.root} ${rng.attributes}>${rng.}</${rng.root}>`
}