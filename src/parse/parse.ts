const serializer = new XMLSerializer();

export const children = (parent: Element, querySelector: string) => [...parent.querySelectorAll(querySelector)].filter(match => match.parentElement === parent);
export const child = (parent: Element, querySelector: string): Element|undefined => children(parent, querySelector)[0];

// exceptNameClass	  ::=  	<except> nameClass </except>
export function exceptNameClass(parent: Element): string[] {
	let ctx: Element|undefined;
	// An <except> may contain a <choice> containing multiple nameClass entries according to the spec
	// But I'm unsure of the semantic meaning of the pattern - it also does not occur in any test I have
	// I think it means something like "must not match one of these options" which when flipped around means "must always match at least one"
	// Which is weird because now you're asking to allow something that's in an <except> element. 
	// So for now let's not deal with that.
	if (ctx = child(parent, 'except')) return nameClass(ctx, true).whitelist;
	else return [];
}

// nameClass	  ::=  	<anyName> [exceptNameClass] </anyName>
// | <nsName ns="string"> [exceptNameClass] </nsName>
// | <name ns="string"> NCName </name>
// | <choice> nameClass nameClass </choice>
export function nameClass(parent: Element, mustExist: boolean = false): {
	blacklist: string[],
	any: boolean,
	whitelist: string[],
} {
	let ctx: Element|undefined;
	if (ctx = child(parent, 'anyName')) return {any: true, blacklist: exceptNameClass(ctx), whitelist: []};
	else if (ctx = child(parent, 'nsName')) return {any: true, blacklist: exceptNameClass(ctx), whitelist: []};
	else if (ctx = child(parent, 'name')) return {any: false, blacklist: [], whitelist: ctx.textContent?.trim() ? [ctx.textContent.trim()] : []};
	else throw new Error(`Missing name class at ${serializer.serializeToString(parent)}`);
};


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
export function nonEmptyPattern(parent: Element) {
	let ctx: Element|undefined;
	if (ctx = child(parent, 'data')) {

	}

};


// // define	  ::=  	<define name="NCName"> <element> nameClass top </element> </define>
// export function define(parent: Element) {
// 	// what we need:
// 	// direct children
// 	// attributes
// 	// requirements on children and attributes


// 	return {
// 		elementName: nameClass(child(parent, 'element')!).whitelist[0],
		

// 	}
	
// 	return {
// 		type: 'element',
// 		name: n.getAttribute('name'),
// 		elementName: n.querySelector('element > name')!.textContent
// 	};
// },