import Xonomy, {XonomyAttributeDefinitionExternal, XonomyDocSpecExternal, XonomyElementDefinitionExternal, XonomyElementInstance} from '@kcmertens/xonomy';
import { Rng, RngAttribute, RngChildSpec, isRef, RngRef } from './types/rng';
import { validateAttribute, validateChildSpec } from './validate';

import './style/warning.css';

const keymap = {
	'backspace': 8,
	'tab': 9,
	'enter': 13,
	'shift': 16,
	'ctrl': 17,
	'alt': 18,
	'pause/break': 19,
	'caps lock': 20,
	'escape': 27,
	'(space)': 32,
	'page up': 33,
	'page down': 34,
	'end': 35,
	'home': 36,
	'left arrow': 37,
	'up arrow': 38,
	'right arrow': 39,
	'down arrow': 40,
	'insert': 45,
	'delete': 46,
	'0': 48,
	'1': 49,
	'2': 50,
	'3': 51,
	'4': 52,
	'5': 53,
	'6': 54,
	'7': 55,
	'8': 56,
	'9': 57,
	'a': 65,
	'b': 66,
	'c': 67,
	'd': 68,	
	'e': 69,
	'f': 70,
	'g': 71,
	'h': 72,
	'i': 73,
	'j': 74,
	'k': 75,
	'l': 76,
	'm': 77,
	'n': 78,
	'o': 79,
	'p': 80,
	'q': 81,
	'r': 82,
	's': 83,
	't': 84,
	'u': 85,
	'v': 86,
	'w': 87,
	'x': 88,
	'y': 89,
	'z': 90,
	'left window key': 91,
	'right window key': 92,
	'select key': 93,
	'numpad 0': 96,
	'numpad 1': 97,
	'numpad 2': 98,
	'numpad 3': 99,
	'numpad 4': 100,
	'numpad 5': 101,
	'numpad 6': 102,
	'numpad 7': 103,	
	'numpad 8': 104,
	'numpad 9': 105,
	'multiply': 106,
	'add': 107,
	'subtract': 109,
	'decimal point': 110,
	'divide': 111,
	'f1': 112,
	'f2': 113,
	'f3': 114,
	'f4': 115,
	'f5': 116,
	'f6': 117,
	'f7': 118,
	'f8': 119,
	'f9': 120,
	'f10': 121,
	'f11': 122,
	'f12': 123,
	'num lock': 144,
	'scroll lock': 145,
	'semi-colon': 186,
	'equal sign': 187,
	'comma': 188,
	'dash': 189,
	'period': 190,
	'forward slash': 191,
	'grave accent': 192,
	'open bracket': 219,
	'back slash': 220,
	'close braket': 221,
	'single quote': 222,
};

const keyState = {};
$(document).on('keypress', e => {
	keyState[e.which] = true;
})

const keys = (k: Array<keyof typeof keymap>) => {
	const label = k.join(' + ');
	return {
		keyCaption: label,
		keyTrigger: (e: JQuery.Event) => {
			const o: KeyboardEvent = (e as any).originalEvent;
			o.code
		}
	}
}


const keyMatcher = (key: keyof typeof keys|Array<keyof typeof keys>) => Array.isArray(key) ? (e: JQuery.Event) => e.p

export function rngToDocspec(rng: Rng): XonomyDocSpecExternal {
	const spec: XonomyDocSpecExternal = {
		elements: Object.entries(rng.elements).reduce<Record<string, XonomyElementDefinitionExternal>>((map, [id, def]) => {
			const allowText = def.children.some(c => c.allowText);
			map[id] = {
				attributes: def.attributes.reduce<Record<string, XonomyAttributeDefinitionExternal>>((map, attId) => {
					const {optional, name, pattern, values} = rng.attributes[attId];
					map[attId] = {
						menu: [{
							action: Xonomy.deleteAttribute,
							caption: `Delete @${name}`,
							hideIf: !optional,
							keyCaption: 'Delete',
							keyTrigger: keyMatcher('delete')
						}]
					}
					return map;
				}, {}),
				canDropTo: [],
				elementName() { return def.element },
				hasText() { return allowText },
				menu: [
					
				],
			}
			return map;
		}, {}),
		validate(root) {
			// we have an element, and we need to check whether it conforms to the child constraints
			// we're only testing direct children here!
		
			const stack: XonomyElementInstance[] = [root];
			let elementInstance: XonomyElementInstance|undefined;
			while (elementInstance = stack.shift()) {
				elementInstance.children.forEach(c => { if (c.type === 'element') stack.push(c); });
				const elementDefinition = rng.elements[elementInstance.name];
				elementDefinition.attributes.forEach(attId => validateAttribute(elementInstance!, rng.attributes[attId]));
				
				const unmatchedChildren = new Set(elementInstance.children.filter(c => c.type === 'element') as XonomyElementInstance[]);
				for (const condition of elementDefinition.children) {
					const result = validateChildSpec(elementInstance, unmatchedChildren, rng, condition, 0);
					if (!result.matched) {
						Xonomy.warnings.push({
							htmlID: elementInstance.htmlID!,
							text: 'Missing required elements:\n' + result.error
						})
					}
				}
				for (const extraChild of unmatchedChildren) {
					Xonomy.warnings.push({
						htmlID: elementInstance.htmlID!,
						text: `Element <${extraChild.elementName}> is not allowed as a child of <${elementInstance.elementName}>`
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
				else { return elementName; }
			}

			// no parent, it may be the root, check that
			if (rng.elements[rng.root].element === elementName) return rng.root;

			// no parent, not the root, check all elements to find possible match
			const definition = Object.values(rng.elements).find(e => e.element === elementName);
			if (definition) { return definition.id }
			else { return elementName; }
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
