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
): {
	matched: boolean;
	error?: string;
	matchedElements: Set<XonomyElementInstance|XonomyTextInstance>
} {	
	const matchedElements = new Set<XonomyElementInstance|XonomyTextInstance>();
	
	if (spec.type === 'and') {
		for (const c of spec.children) {
			if (isRef(c)) {
				let matched = false;
				for (const i of unmatchedChildren) {
					if (i.type === 'element' && i.name === c.id) {
						unmatchedChildren.delete(i);
						matchedElements.add(i);
						matched = true;
						if (!c.multiple) break; // not multiple: only match one.
					}
				}

				if (!matched) {
					return {
						matched: false,
						error: `Missing required child element ${rng.elements[c.id].element}`,
						matchedElements
					}
				}

				continue; 
			} else {
				// group
				// it's not a child element, but a choice or group of them
				// so check that that matches.
				const result = validateChildSpec(instance, unmatchedChildren, rng, c);
				if (!result.matched) return result;
			}
		}
	} else { // at most one match
		const errors: string[] = [];

		let matchedAny = false;
		for (const c of spec.children) {
			if (isRef(c)) {
				for (const i of unmatchedChildren) {
					if (i.type === 'element' && i.name === c.id) {
						unmatchedChildren.delete(i);
						matchedElements.add(i);
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
					errors.push(result.error!);
				}
			}
		}
		if (!matchedAny) {
			return {
				matched: false,
				matchedElements,
				error: `Missing one of the following required element(s): ${errors.map(e => '\n\t— ' + e).join('')}`
			}
		}
	}

	return {
		matched: true,
		matchedElements
	}
}
