<template>
	<pre>{{parseTree}}</pre>
</template>

<script lang="ts">

const children = (parent: Element, querySelector: string) => [...parent.querySelectorAll(querySelector)].filter(match => match.parentElement === parent);
const child = (parent: Element, querySelector: string) => children(parent, querySelector)[0] || null;

const serializer = new XMLSerializer();

import Vue from 'vue';
export default Vue.extend({
	props: {
		doc: XMLDocument,
	},
	computed: {
		parseTree(): any {
			const d = this.doc;
			



			return undefined;
		}
	},
	methods: {
		// grammar	  ::=  	<grammar> <start> top </start> define* </grammar>
		grammar(n: Element) {
			return {
				root: this.top(n.querySelector('start')!),
				definitions: [...n.querySelectorAll('define')].map(node => this.define(node)).reduce((acc, d) => { acc[d.name] = d; return acc; }, {}),
			}
		},
		// define	  ::=  	<define name="NCName"> <element> nameClass top </element> </define>
		define(n: Element) {
			
			return {
				type: 'element',
				name: n.getAttribute('name'),
				elementName: n.querySelector('element > name')!.textContent
			};
		},
		// top	  ::=  	<notAllowed/>
			// | pattern
		top(ctx: Element) {
			if (!ctx) { return; }
			let data: any;
			if (data = child(ctx, 'notAllowed')) {
				return null;
			} 
			data = this.pattern(ctx); 
			if (!data) return null;

		},
		// pattern	  ::=  	<empty/>
		// | nonEmptyPattern
		pattern(n: Element): string {
			if (!n) { return ''; }
			return '';

		},
		// nonEmptyPattern	  ::=  	<text/>
		// | <data type="NCName" datatypeLibrary="anyURI"> param* [exceptPattern] </data>
		// | <value datatypeLibrary="anyURI" type="NCName" ns="string"> string </value>
		// | <list> pattern </list>
		// | <attribute> nameClass pattern </attribute>
		// | <ref name="NCName"/>
		// | <oneOrMore> nonEmptyPattern </oneOrMore>
		// | <choice> pattern nonEmptyPattern </choice>
		// | <group> nonEmptyPattern nonEmptyPattern </group>
		// | <interleave> nonEmptyPattern nonEmptyPattern </interleave>
		nonEmptyPattern(n: Element) {
			if (!n) { return; }

		},

		// param	  ::=  	<param name="NCName"> string </param>
		param(n: Element) {
			if (!n) { return; }

		},
		// exceptPattern	  ::=  	<except> pattern </except>
		exceptPattern(n: Element) {
			if (!n) { return; }

		},
		// nameClass	  ::=  	<anyName> [exceptNameClass] </anyName>
		// | <nsName ns="string"> [exceptNameClass] </nsName>
		// | <name ns="string"> NCName </name>
		// | <choice> nameClass nameClass </choice>
		nameClass(parent: Element, mustExist: boolean = false): {
			blacklist: string[],
			any: boolean,
			whitelist: string[],
		} {
			// je wil dit niet uitzoeken in de parent
			// dus het moet in de functie zelf
			// die moet dan de parsing doen
			// maar soms wil je juist dat de node uit zichzelf al opgepakt wordt
			// dus je wil een functie die extract
			// en een die parsed
			// dan kun je zomaar iets in de extractie functie gooien
			// en dan roept die de parse functie aan
			
			const stack: Element[] = [];
			stack.push(...parent.children);

			
			const parses: Array<{any: boolean, blacklist: string[], whitelist: string[]}> = [];
			let ctx: Element|undefined;
			while (ctx = stack.shift()) {
				switch (ctx.tagName) {
					case 'anyName':
					case 'nsName': parses.push({any: true, blacklist: blacklist(ctx), whitelist: []}); continue;
					case 'name': parses.push({any: false, blacklist: [], whitelist: name(ctx)}); continue;
					case 'choice': stack.push(...ctx.children); continue;
					default: throw new Error(`Unexpected element ${ctx.tagName} where name declaration was expected at ${serializer.serializeToString(parent)}`);
				}
			}

			// check if we got what we needed
			if (mustExist && parses.length === 0) throw new Error(`Missing required name declaration at ${serializer.serializeToString(parent)}`);


			// merge declarations (if there was a choice)
			const any: boolean = !!parses.find(o => o.any);
			const whitelist = any ? [] : parses.reduce<string[]>((list, o) => { list.push(...o.whitelist); return list;}, []);
			const blacklist = whitelist.length ? [] : parses.reduce<string[]>((list, o) => { list.push(...o.blacklist); return list;}, []);
		
			return { any, whitelist, blacklist }
		},
		// exceptNameClass	  ::=  	<except> nameClass </except>
		exceptNameClass(n: Element): string {
			return n.textContent!;
		}
	}
})
</script>