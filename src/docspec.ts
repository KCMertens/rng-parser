import Xonomy, {XonomyAttributeDefinitionExternal, XonomyDocSpec, XonomyDocSpecExternal, XonomyElementDefinitionExternal, XonomyElementInstance} from '@kcmertens/xonomy';
import {Rng, RngAttribute, RngChildSpec, isRef, RngRef} from './rng-parser';
import { validateAttribute, validateChildSpec } from './validate';

export function rngToDocspec(rng: Rng): XonomyDocSpecExternal {
	debugger;
	const spec: XonomyDocSpecExternal = {
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
		}, {}),
		validate(root) {
			// we have an element, and we need to check whether it conforms to the child constraints
			// we're only testing direct children here!
		
			const stack: XonomyElementInstance[] = [root];
			let cur: XonomyElementInstance|undefined;
			while (cur = stack.shift()) {
				cur.children.forEach(c => { if (c.type === 'element') stack.push(c); });
				const def = rng.elements[cur.name];
				def.attributes.forEach(attId => validateAttribute(cur!, rng.attributes[attId]));
				
				const unmatchedChildren = new Set(cur.children.filter(c => c.type === 'element') as XonomyElementInstance[]);
				for (const condition of def.children) {
					const result = validateChildSpec(cur, unmatchedChildren, rng, condition);
					if (result.error) {
						Xonomy.warnings.push({
							htmlID: cur.htmlID!,
							text: result.error
						})
					}
				}
				for (const extraChild of unmatchedChildren) {
					Xonomy.warnings.push({
						htmlID: cur.htmlID!,
						text: `Element <${extraChild.elementName}> is not allowed as a child of <${cur.elementName}>`
					})
				}
			}
		},
		getElementId(elementName: string, parentId?: string) {
			if (parentId != null) {
				const queue: Array<RngChildSpec|RngRef> = rng.elements[parentId].children.concat(); // make a copy!
				const foundChildren: RngRef[] = [];
				let cur: RngChildSpec|RngRef|undefined;
				while (cur = queue.pop()) {
					if (isRef(cur)) {
						foundChildren.push(cur);
					} else {
						queue.push(...cur.children);
					}
				}

				const definition = foundChildren.find(c => rng.elements[c.id].element === elementName)
				if (definition) { return definition.id }
				else { debugger; return elementName; }
			}

			// no parent, it may be the root, check that
			if (rng.elements[rng.root].element === elementName) return rng.root;

			// no parent, not the root, check all elements to find possible match
			const definition = Object.values(rng.elements).find(e => e.element === elementName);
			if (definition) { return definition.id }
			else { debugger; return elementName; }
		}
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
