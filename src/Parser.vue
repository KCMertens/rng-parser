<template>
	<pre>{{parseTree}}</pre>
</template>

<script lang="ts">

const children = (parent: Element, querySelector: string) => [...parent.querySelectorAll(querySelector)].filter(match => match.parentElement === parent);
const child = (parent: Element, querySelector: string) => children(parent, querySelector)[0] || null;

const serializer = new XMLSerializer();

type rngElement = {
	id: string;
	element: string;
	attributes: string[];
	allowText: boolean;
	allowEmpty: boolean;
	allowedChildren: string[];
}

type rngAttribute = {
	id: string; 
	name: string;
	values: string[];
	optional: boolean;
	pattern: string|null;
}


import Vue from 'vue';
export default Vue.extend({
	props: {
		doc: XMLDocument,
	},
	data: () => ({
		attributeCache: {} as {
			[name: string]: rngAttribute[]
		},
		nextAttributeId: 0
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
				attributes: Object.values(this.attributeCache).flat().reduce((map, cur) => {
					map[cur.id] = cur;
					return map;
				}, {} as {[id: string]: rngAttribute}),
				root: this.root(d),
			}
		}
	},
	methods: {
		root(ctx: Element): string {
			return ctx.querySelector('start ref')!.getAttribute('name')!;
		},
		element(ctx: Element): any {
			const defName = ctx.getAttribute('name');
			const elName = ctx.querySelector('name')!.textContent;
			const attributes = [...ctx.querySelectorAll('attribute')].map(el => this.attribute(el));
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
		},

		attribute(ctx: Element): any {
			const name = ctx.querySelector('name')!.textContent!;
			const optional = ctx.getAttribute('optional') != null;
			const values = [...ctx.querySelectorAll('value')].map(el => el.textContent!);
			const pattern = ctx.querySelector('param[name="pattern"]')?.textContent || null;

			return this.findOrCreateAttribute(name, optional, values, pattern);
		},

		findOrCreateAttribute(name: string, optional: boolean, values: string[], pattern: string|null): string {
			const list = (this.attributeCache[name] = (this.attributeCache[name] || []));
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
	}
})
</script>