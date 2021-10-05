import Xonomy, {XonomyAttributeDefinitionExternal, XonomyDocSpecExternal, XonomyElementDefinitionExternal, XonomyElementInstance, XonomyMenuAction, XonomyMenuActionExternal, XonomyPickListOption} from '@kcmertens/xonomy';
import { Rng, RngAttribute, RngChildSpec, isRef, RngRef } from './types/rng';
import { validateAttribute, validateChildSpec } from './validate';

import './style/warning.css';

type Key = 'Delete'; // todo add others, probably
type ModifierKey = 'Alt'|'Control'|'Shift';

const keyTrigger = (k: Key, mods: ModifierKey[] = []): {
	keyCaption: string,
	keyTrigger: (e: JQuery.Event) => boolean
} => {
	return {
		keyCaption: [...mods, k].join('+'),
		keyTrigger: (e: JQuery.Event) => {
			debugger;
			const originalEvent = (e as any).originalEvent as KeyboardEvent;
			return mods.every(mod => originalEvent.getModifierState(mod)) && originalEvent.key === k;
		}
	}
}


function menu(rng: Rng, specs: readonly RngChildSpec[]): XonomyMenuActionExternal[] {
	function refOption(spec: RngRef, parent?: RngChildSpec): XonomyMenuActionExternal {
		return {
			caption: `<${rng.elements[spec.id].element}>`,
			action: function(htmlID: string, param: any, el: HTMLDivElement) {
				el.classList.toggle('checked');
				// spec.check(spec);
			} as any,
		}
	}

	function orOption(spec: RngChildSpec, parent?: RngChildSpec): XonomyMenuActionExternal {
		return {
			caption: 'Pick one',
			menu: [
				...spec.children.filter(c => isRef(c)).map(o => refOption(o as RngRef, spec)),
				...spec.children.filter(c => !isRef(c)).map((o: RngChildSpec) => o.type === 'and' ? andOption(o, spec, true) : orOption(o, spec))
			],
		}
	}
	
	function isRequired(s: RngChildSpec): boolean {
		for (const c of s.children) {
			if (!isRef(c)) return isRequired(c);
			else if (!c.optional) return true;
		}
		return false;
	}
	function andOption(spec: RngChildSpec, parent: RngChildSpec|undefined, forceChoices = false): XonomyMenuActionExternal {
		const requiredRefs = spec.children.filter(c => isRef(c) && !c.optional) as RngRef[];
		const requiredChoices = spec.children.filter(c => !isRef(c) && (forceChoices || isRequired(c))) as RngChildSpec[];
		
		if (!requiredRefs.length && !requiredChoices.length) throw new Error('all options should have something be required.');

		return {
			caption: requiredRefs.map(r => `<${rng.elements[r.id].element}>`).join('+') + ' and one of each section below',
			menu: requiredChoices.map(s => s.type === 'and' ? andOption(s, spec, forceChoices) : orOption(s, spec))
		}
	}

	return specs.filter(s => isRef(s) ? !s.optional : isRequired(s)).map(s => 
		isRef(s) ? refOption(s)
		: s.type === 'and' ? andOption(s, undefined) 
		: orOption(s)
	);
}

export function rngToDocspec(rng: Rng): XonomyDocSpecExternal {
	const spec: XonomyDocSpecExternal = {
		elements: Object.entries(rng.elements).reduce<Record<string, XonomyElementDefinitionExternal>>((map, [id, def]) => {
			const allowText = def.children.some(c => c.allowText);
			map[id] = {
				attributes: def.attributes.reduce<Record<string, XonomyAttributeDefinitionExternal>>((map, attId) => {
					const {optional, name, pattern, values} = rng.attributes[attId];
					map[name] = {
						menu: [{
							action: Xonomy.deleteAttribute,
							actionParameter: rng.attributes[attId],
							caption: `Delete @${name}`,
							hideIf: !optional,
							...keyTrigger('Delete')
						}],
						asker: values && values.length ? Xonomy.askPicklist : Xonomy.askString,
						askerParameter: values.map<XonomyPickListOption>(v => ({caption: v, value: v}))
					}
					return map;
				}, {}),
				canDropTo: [],
				elementName() { return def.element },
				hasText() { return allowText },
				menu: [{
					caption: 'Add attributes',
					menu: def.attributes.map<XonomyMenuActionExternal>(attId => {
						const spec = rng.attributes[attId];
						return {
							action: Xonomy.newAttribute,
							actionParameter: rng.attributes[attId],
							caption: `Add @${spec.name}`,
							hideIf(inst: XonomyElementInstance) { return inst.getAttribute(attId) != null; },
						}
					}),
				}, {
					caption: 'Add child elements',
					menu: menu(rng, def.children)
				
				}]
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

// hoe kunnen we xonomy menu rendering overriden
// hmm

const originalMakeBubble = Xonomy.makeBubble;
Xonomy.makeBubble = function(content: string|HTMLElement) {
	if (typeof content === 'string') return originalMakeBubble(content);
	
	Xonomy.destroyBubble();
	const bubble = parseHtml(removeFalsy`
	<div id="xonomyBubble" class="${Xonomy.mode}">
		<div class='inside' onclick='Xonomy.notclick=true;'><div id='xonomyBubbleContent'></div></div>
	</div>`);
	bubble.querySelector('#xonomyBubbleContent')!.appendChild(content);
	return bubble;
}


function parseHtml<T extends HTMLElement = HTMLDivElement>(s: string): T {
	const helper = document.createElement('div');
	helper.innerHTML = s;
	return helper.removeChild(helper.firstChild!) as T;
}

function removeFalsy(strings: TemplateStringsArray, ...expressions: any[]) {
	let r = ''
	for (let i = 0; i < strings.length; ++i) {
		r += strings[i].trim();
		r += ' ';
		if (expressions[i]) r += expressions[i] + ' ';
	}
	return r;
}

Xonomy.internalMenu = function(htmlID: string, items: XonomyMenuAction[], harvest: (typeof Xonomy)['harvestElement'|'harvestAttribute'|'harvestText'] ) {
	const inst = harvest(document.getElementById(htmlID)!);
	const ownItem = parseHtml(`<div class='menu'></div>`);

	// render the menu options, make sure to instantiate the elements already.
	for (const item of items) {
		Xonomy.verifyDocSpecMenuItem(item);
		const {icon, keyTrigger, keyCaption, menu: menuOptions = [], expanded, caption, action, actionParameter} = item;
		const menuItem = parseHtml(removeFalsy`
			<div class='menuItem ${expanded(inst) && 'expanded'}'>
				<div class='menuLabel focusme' tabindex='0'> 
					${/*icon*/ icon && `<span class='icon'><img src='${icon}'/></span>`}
					${/*text*/ Xonomy.formatCaption(Xonomy.textByLang(caption(inst)))}
				</div>
			</div>
		`);
		const label = menuItem.querySelector('.menuLabel') as HTMLDivElement|undefined;
		if (label) {
			label?.addEventListener('keydown', function(event) { if(Xonomy.keyNav && [37, 39].indexOf(event.which)>-1) Xonomy.toggleSubmenu(this.parentElement!) });
			label?.addEventListener('click', function() { Xonomy.toggleSubmenu(this.parentElement!) });
		}

		// for the child, replace the class with 'submenu'
		// and always wrap self in 'menu'
		
		if (menuOptions.length) {
			const subMenu = Xonomy.internalMenu(htmlID, menuOptions, harvest, undefined as any, undefined as any) as any as HTMLDivElement;
			subMenu.classList.replace('menu', 'submenu');
			subMenu.classList.toggle('expanded', expanded(inst));
			menuItem.appendChild(subMenu);
		} else {
			menuItem.addEventListener('click', function() { (action as any)(htmlID, actionParameter, menuItem); });
		}

		ownItem.appendChild(menuItem);
		(item as any)._html = ownItem;
	}
	
	return ownItem;
} as any;
