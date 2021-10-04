
export type RngRef = {
	id: string;
	optional: boolean;
	multiple: boolean;
}

export type RngChildSpec = {
	type: 'and'|'or';
	children: ReadonlyArray<RngRef|RngChildSpec>;
	allowText: boolean;
}

export type RngElement = {
	id: string;
	element: string;
	attributes: string[];
	children: readonly RngChildSpec[];
}

export type RngAttribute = {
	id: string; 
	name: string;
	values: string[];
	optional: boolean;
	pattern: string|null;
}

export type Rng = {
	root: string;
	elements: { [id: string]: RngElement },
	attributes: { [id: string]: RngAttribute; }
}

export type Xema = {
	root: string;
	elements: {
		[id: string]: {
			elementName: string;
			// inl=text+children, txt=text only, chd=children only
			filling: 'inl'|'txt'|'chd'|'emp';
			values: string[];
			children: Array<{min: number, max: number|null, name: string}>;
			attributes: {
				[id: string]: {
					optionality: 'optional'|'obligatory';
					filling: 'txt'|'lst'; // whether to use value list?
					values?: Array<{
						value: string;
						caption: string;
					}>
				}
			}
		}
	}
}

export function isRef(e: any): e is RngRef { return e && e.id && !e.children; }