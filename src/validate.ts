import Xonomy, { XonomyElementInstance, XonomyTextInstance } from "@kcmertens/xonomy";
import { isRef, Rng, RngAttribute, RngChildSpec } from "./types/rng";

export function validateAttribute(inst: XonomyElementInstance, att: RngAttribute) {
	const found = inst.attributes.find(a => a.name === att.name);
	if (!found) {
		if (!att.optional) Xonomy.warnings.push({htmlID: inst.htmlID!, text: `Missing required attribute ${att.name}`});
		return;
	}
	if (att.values.length && !att.values.includes(found.value)) {
		Xonomy.warnings.push({htmlID: found.htmlID!, text: `Value is not permitted`});
	}
	if (att.pattern && !new RegExp(att.pattern).test(found.value)) {
		Xonomy.warnings.push({htmlID: found.htmlID!, text: `Value is not permitted`});
	}
}

export function validateChildSpec(
	instance: XonomyElementInstance,
	unmatchedChildren: Set<XonomyElementInstance>,
	rng: Rng,
	spec: RngChildSpec,
	depth: number
): {
	matched: boolean;
	error: string;
} {
	// todo massage this away during construction of the xema
	if (spec.children.length === 1 && !isRef(spec.children[0])) {
		return validateChildSpec(instance, unmatchedChildren, rng, spec.children[0] as RngChildSpec, depth);
	}

	// or group
	// every element split by -----
	// and group
	// every element separated by ','
	// every subgroup separated by newline

	/*
		p
		-----
		a,b,c
		-----
		q
		one of
			p
			-------
			d, o, u
			one of
				d
				-----
				p
				-----
				q
			-------
			o, o, o
	*/

	const padding = ''.padStart(depth+1, '\t');
		
	const missingRefs = [] as string[];
	const missingChoices = [] as string[];

	let allMatched = true;
	let anyMatched = false;
	for (const c of spec.children) {
		if (isRef(c)) {
			let matched = false;
			for (const i of unmatchedChildren) { 
				if (i.name === c.id) {
					matched = true;
					unmatchedChildren.delete(i);
					if (!c.multiple) break;
				}
			}
			if (matched) anyMatched = true;
			else if (!c.optional) {
				allMatched = false;
				missingRefs.push(rng.elements[c.id].element);
			} 
		} else {
			const r = validateChildSpec(instance, unmatchedChildren, rng, c, c.type === 'and' ? depth : depth+1);
			if (r.matched) anyMatched = true;
			else {
				missingChoices.push(r.error);
				allMatched = false;
			}
		}
	}
	
	const sectionSeparator = spec.type === 'and' ? '' : `\n${padding}------`;
	const elementSeparator = spec.type === 'or' ? `\n${padding}------\n${padding}` : ', ';

	
	/*
	wil een aantal separators printen tussen missing elements
	dan moeten de separator lines een eigen line worden

	wat gebeurt er in de parent met die dingen?
	verwachting is dat de parent die joined
	alle errors lines van een child worden met newlines aan elkaar geplakt
	alle children worden met separators aan elkaar geplakt?


	child mag meerdere lines outputten
		een or child doet nu 
			1 line voor alle missing elements - separated door line separators?
			moet zijn: 1 line per uiteindelijk regel, moet een keuze zijn tussen and/or of we ze moeten joinen?
			1 line voor alle missing choices - seperated door line separators - en da's verkeerd, want komma's
			moet zijn: 1 line PER choice, + separators in losse lines (dus zonder newlines er in).
		een and child doet nu 1 line voor alle missing elements - separated door komma's

	het element zelf doet wat met de children?


	separators moeten gebeuren in de parent
	de childen moeten een enkele string outputten die aangeeft wtf er aan de hand is
	dan kan de parent die opsparen en separators voor genereren.
	einde


	a
	-----
	b
	------
	c
	*/

	const baseIndent = ''.padStart(depth, '\t');
	const childIndent = baseIndent + '\t';
	
	const joinElementAnd = ', ';
	const joinElementOr = `\n${childIndent}------\n${childIndent}`;
	const joinSectionAnd = '\n';
	const joinSectionOr = `\n${childIndent}------\n`;

	const joinSection = spec.type === 'or' ? joinSectionOr : joinSectionAnd;
	const joinElement = spec.type === 'or' ? joinElementOr : joinElementAnd;
	
	let r = ''
	if (spec.type === 'or') r += baseIndent + 'One of\n';
	if (missingRefs.length) r += childIndent + missingRefs.join(joinElement);
	if (missingRefs.length && missingChoices.length) r += joinSection;
	if (missingChoices.length) r += missingChoices.join(joinSection);

	// if (missingRefs.length && missingChoices.length) debugger;

	return {
		error: r,
		matched: (spec.type === 'and') ? allMatched : anyMatched
	}
}
