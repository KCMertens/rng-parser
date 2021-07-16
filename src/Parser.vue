<template>
	<div>
		<h2>parse tree</h2>
		<textarea readonly :value="JSON.stringify(parseTree, undefined, 2)"></textarea>
		<h2>xema</h2>
		<pre>{{xema}}</pre>
	</div>
</template>

<script lang="ts">

const children = (parent: Element, querySelector: string) => [...parent.querySelectorAll(querySelector)].filter(match => match.parentElement === parent);
const child = (parent: Element, querySelector: string) => children(parent, querySelector)[0] || null;

const serializer = new XMLSerializer();

const isRef = function(e: any): e is ref { return !!(e && e.id); }
type ref = {
	id: string;
	optional: boolean;
	multiple: boolean;
}

type rngChildSpec = {
	type: 'and'|'or';
	children: Array<ref|rngChildSpec>;
	allowText: boolean;
}

type rngElement = {
	id: string;
	element: string;
	attributes: string[];
	children: rngChildSpec[];
}

type rngAttribute = {
	id: string; 
	name: string;
	values: string[];
	optional: boolean;
	pattern: string|null;
}

type rng = {
	root: string;
	elements: { [id: string]: rngElement },
	attributes: { [id: string]: rngAttribute; }
}

type xema = {
	root: string;
	elements: {
		[id: string]: {
			// inl=text+children, txt=text only, chd=children only
			filling: 'inl'|'txt'|'chd'|'emp';
			values: string[];
			children: Array<{min: number, max: number|null, name: string}>;
			attributes: {
				[id: string]: {
					optionality: 'optional'|'obligatory';
					filling: 'txt'|'lst'; // whether to use value list?
					options?: Array<{
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


import Vue from 'vue';
export default Vue.extend({
	props: {
		doc: XMLDocument,
	},
	data: () => ({
		attributeCache: new AttributeCache(),
	}),
	computed: {
		parseTree(): rng|null {
			if (!this.doc) return null;

			const d = this.doc.documentElement;

			return {
				elements: [...d.querySelectorAll('define')].map(el => this.element(el)).reduce((map, cur) => {
					map[cur.id] = cur;
					return map;
				}, {} as {[id: string]: rngElement}),
				attributes: this.attributeCache.map(),
				root: this.root(d),
			}
		},
		xema(): xema|null {
			const t = this.parseTree;
			if (!t) return null;

			var xema: xema = {
				root: t.root, 
				elements: {},
			};

			Object.values(t.elements).forEach(e => {
				const objectEl: xema['elements'][string] = {
					filling: 'txt',
					values: [], 
					// type xmlElementChild
					children: [],
					attributes: {}
				}; 
			
				let hasText = false;
				let hasChildElements = false;
				function hasRef(e: rngChildSpec|ref): boolean { return isRef(e) || !!e.children.find(c => hasRef(c)); }
				
				e.children.forEach(childGroup => {
					hasText = hasText || childGroup.allowText;
					hasChildElements = hasChildElements || hasRef(childGroup);
				});
				//select element type: inl=text+children, txt=text only, chd=children only
				objectEl.filling = hasText ? hasChildElements ? 'inl' : 'txt' : hasChildElements ? 'chd' : 'emp'; 

				//add allowed child elements, flattened, throw away choice and sequence
				const add = (e: rngChildSpec|ref): any => isRef(e) 
					? objectEl.children.push({
						min: e.optional ? 0 : 1,
						max: e.multiple ? 1 : null,
						name: e.id
					}) 
					: e.children.forEach(c => add(c));
				
				e.children.forEach(add);

				// add attributes for current element
				e.attributes.forEach(a => {
					const attDef = t.attributes[a];
					objectEl.attributes[attDef.name] = {
						optionality: attDef.optional ? 'optional' : 'obligatory',
						filling: attDef.values.length ? 'lst' : 'txt',
						options: attDef.values.length ? attDef.values.map(v => ({
							value: v,
							caption: v
						})) : undefined
					}
				})

				xema.elements[e.id] = objectEl;
			});
			return xema;
		}
	},
	methods: {
		root(ctx: Element): string {
			return ctx.querySelector('start ref')!.getAttribute('name')!;
		},
		element(ctx: Element): rngElement {
			const defName = ctx.getAttribute('name')!;
			ctx = child(ctx, 'element');
			const elName = child(ctx, 'name')!.textContent!;
			
			const s: any = {};

			const r: rngElement = {
				id: defName,
				attributes: [...ctx.querySelectorAll('attribute')].map(el => this.attribute(el)),
				element: elName,
				children: children(ctx, 'group, choice').map<rngChildSpec>(e => {
					switch (e.tagName) {
						case 'group': return this._group(e);
						case 'choice': return this._choice(e);
						default: throw new Error(`Unexpected element ${e.tagName}`);
					}
				}),
			}

			return r;
		},

		_group(ctx: Element): rngChildSpec {
			const r: rngChildSpec = {
				type: 'and',
				allowText: false, 
				children: []
			};

			const stack = [...ctx.children];
			let c: Element|undefined;
			while ((c = stack.shift()) != null) {
				switch (c.tagName) {
					case 'choice': r.children.push(this._choice(c)); continue;
					case 'group': stack.push(...c.children); continue;
					case 'attribute': continue; // parsed separately
					case 'empty': continue; // empty as a child of group is meaningless.
					case 'text': r.allowText = true; continue;
					case 'ref': r.children.push({id: c.getAttribute('name')!, optional: c.hasAttribute('optional'), multiple: c.hasAttribute('multiple')}); continue;
					default: console.warn(`unexpected element ${c.tagName} in <group> for element ${ctx.closest('define')!.getAttribute('name')!}`); continue;
				}
			}

			return r;
		},
		_choice(ctx: Element): rngChildSpec {
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
					case 'group': r.children.push(this._group(c)); continue;
					case 'attribute': continue; // parsed separately
					case 'empty': continue; // empty as a child of group is meaningless.
					case 'text': r.allowText = true; continue;
					case 'ref': r.children.push({id: c.getAttribute('name')!, optional: c.hasAttribute('optional'), multiple: c.hasAttribute('multiple')}); continue;
					default: console.warn(`unexpected element ${c.tagName} in <group> for element ${ctx.closest('define')!.getAttribute('name')!}`); continue;
				}
			}

			return r;
		},

		attribute(ctx: Element): any {
			const name = ctx.getAttribute('name')!;
			const optional = ctx.hasAttribute('optional');
			const pattern = ctx.querySelector('param[name="pattern"]')?.textContent || null;
			const values = children(ctx, 'value').map(el => el.textContent!);

			return this.attributeCache.getId(name, optional, pattern, values);
		},
	}
})
</script>