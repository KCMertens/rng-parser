<template>
	<pre>{{parseTree}}</pre>
</template>

<script lang="ts">

const children = (parent: Element, querySelector: string) => [...parent.querySelectorAll(querySelector)].filter(match => match.parentElement === parent);
const child = (parent: Element, querySelector: string) => children(parent, querySelector)[0] || null;

const serializer = new XMLSerializer();

type ref = {
	id: string;
	optional: boolean;
	multiple: boolean;
}

type rngChildSpecAnd = {
	type: 'and';
	elements: Array<ref|rngChildSpecOr>;
	allowText: boolean;
}

type rngChildSpecOr = {
	type: 'or';
	elements: Array<ref|rngChildSpecAnd>;
	allowText: boolean;
}

type rngChildSpec = rngChildSpecAnd|rngChildSpecOr;

type rngElement = {
	id: string;
	element: string;
	attributes: string[];
	allowedChildren: rngChildSpec[];
}

type rngAttribute = {
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


import Vue from 'vue';
export default Vue.extend({
	props: {
		doc: XMLDocument,
	},
	data: () => ({
		attributeCache: new AttributeCache(),
	}),
	computed: {
		parseTree(): any {
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
				allowedChildren: children(ctx, 'group, choice').map<rngChildSpec>(e => {
					switch (e.tagName) {
						case 'group': return this._group(e);
						case 'choice': return this._choice(e);
					}
				}),
			}

			return r;
		},

		_group(ctx: Element): any {
			const r: rngChildSpecAnd = {
				type: 'and',
				allowText: false, 
				elements: []
			};

			const stack = [...ctx.children];
			let c: Element|undefined;
			while ((c = stack.shift()) != null) {
				switch (c.tagName) {
					case 'choice': r.elements.push(this._choice(c)); continue;
					case 'group': stack.push(...c.children); continue;
					case 'attribute': continue; // parsed separately
					case 'empty': continue; // empty as a child of group is meaningless.
					case 'text': r.allowText = true; continue;
					case 'ref': r.elements.push({id: c.getAttribute('name')!, optional: c.hasAttribute('optional'), multiple: c.hasAttribute('multiple')}); continue;
					default: console.warn(`unexpected element ${c.tagName} in <group> for element ${ctx.closest('define')!.getAttribute('name')!}`); continue;
				}
			}

			return r;
		},
		_choice(ctx: Element): rngChildSpecOr {
			const r: rngChildSpecOr = {
				type: 'or',
				allowText: false, 
				elements: []
			};

			const stack = [...ctx.children];
			let c: Element|undefined;
			while ((c = stack.shift()) != null) {
				switch (c.tagName) {
					case 'choice': stack.push(...c.children); continue;
					case 'group': r.elements.push(this._group(c)); continue;
					case 'attribute': continue; // parsed separately
					case 'empty': continue; // empty as a child of group is meaningless.
					case 'text': r.allowText = true; continue;
					case 'ref': r.elements.push({id: c.getAttribute('name')!, optional: c.hasAttribute('optional'), multiple: c.hasAttribute('multiple')}); continue;
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