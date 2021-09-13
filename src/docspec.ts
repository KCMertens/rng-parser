import Xonomy, {XonomyDocSpec} from '@kcmertens/xonomy';
import {rng} from './rng-parser';

export function rngToDocspec(rng: rng): Partial<XonomyDocSpec> {
	return {
		elements: Object.entries(rng.elements).reduce<XonomyDocSpec['elements']>((map, [id, def]) => {
			const allowText = def.children.some(c => c.allowText);
			map[id] = {
				asker: Xonomy.askLongString,
				askerParameter: undefined,
				attributes: {},
				backgroundColour() { return '' },
				canDropTo: [],
				collapsed() { return false },
				collapsible() { return true },
				elementName() { return def.element },
				hasText() { return allowText },
				inlineMenu: [],
				isInvisible() { return false },
				isReadOnly() { return false },
				localDropOnly() { return false },
				menu: [],
				oneliner() { return false },
			}
			return map;
		}, {})
	}
}