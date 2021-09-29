import Xonomy, { XonomyAttributeInstance, XonomyElementInstance, XonomyTextInstance } from "@kcmertens/xonomy";
import { isRef, Rng, RngAttribute, RngChildSpec, RngElement, RngRef } from "./rng-parser";

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
	unmatchedChildren: Set<XonomyElementInstance|XonomyTextInstance>,
	rng: Rng,
	spec: RngChildSpec,
	depth = 0
): {
	matched: boolean;
	errors: string[];
} {
	let specMatched = true;
	const specErrors = [] as string[];

	let padding = ''.padStart(depth, '\t');
	let errorHeader = padding;

	if (spec.type === 'and') {
		errorHeader = padding+'Missing required element(s):';
		let lastref= false;
		let first = true;
		for (const c of spec.children) {
			
			if (isRef(c)) {
				let matched = false;
				for (const i of unmatchedChildren) {
					if (i.type === 'element' && i.name === c.id) {
						unmatchedChildren.delete(i);
						matched = true;
						if (!c.multiple) break; // not multiple: only match one.
					}
				}

				if (!matched && !c.optional) {
					specMatched = false;
					if (!lastref && !first) specErrors.push(padding + '----------');
					specErrors.push(padding + `<${rng.elements[c.id].element}>`);
					lastref = true;
				}
				
			} else {
				// group
				// it's not a child element, but a choice or group of them
				// so check that that matches.
				const result = validateChildSpec(instance, unmatchedChildren, rng, c);
				if (!result.matched) {
					specMatched = false;
					if (lastref && !first) specErrors.push(padding + '----------');
					specErrors.push(...result.errors);
					lastref = false;
				};
			}
			first = false;
		}
	} else { // at most one match
		let matchedAny = false;
		errorHeader = padding+'Missing one of the following requirements:'
		let lastref = false;
		let first = true;
		for (const c of spec.children) {
			if (isRef(c)) {
				// push error preemptively so we don't have to walk tree twice.
				if (!lastref && !first) specErrors.push(padding + '----------')
				specErrors.push(padding + `<${rng.elements[c.id].element}>`)
				lastref = true;
				
				for (const i of unmatchedChildren) {
					if (i.type === 'element' && i.name === c.id) {
						unmatchedChildren.delete(i);
						matchedAny = true;
						if (!c.multiple) break; // not multiple: only match one.
					}
				}
				if (matchedAny) break; // matched a child - stop processing
			} else {
				const result = validateChildSpec(instance, unmatchedChildren, rng, c);
				if (result.matched) {
					matchedAny = true;
					break;
				} else {
					if (lastref && !first) specErrors.push(padding + '----------');
					specErrors.push(...result.errors);
					lastref = false;
				}
			}
			first = false;
		}
		if (!matchedAny) {
			specMatched = false;
		}
	}
	specErrors.unshift(errorHeader);

	return {
		matched: specMatched,
		errors: specErrors
	}
}
