<template>
	<div>
		<h2>parse tree</h2>
		<textarea id="parsetree" readonly :value="JSON.stringify(parseTree, undefined, 2)"></textarea>
		<h2>xema tree</h2>
		<textarea id="xematree" readonly :value="JSON.stringify(xema, undefined, 2)" style="width: 100%;"></textarea>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

import * as simplify from '@/rng-parser';

export default Vue.extend({
	data: () => ({
		nonce: 0,
		doc: '' as string,
		simplified: '' as string,
	}),
	computed: {
		parseTree(): simplify.rng|null {
			return this.simplified ? simplify.parseSimplifiedRNG(this.simplified) : null
		},
		xema(): simplify.Xema|null {
			return this.parseTree ? simplify.rngToXema(this.parseTree) : null
		}
	},
	async mounted() {
		let rngEditor: HTMLTextAreaElement|null = document.querySelector('.block.rng textarea');
		while (!rngEditor || !rngEditor.value) {
			rngEditor = document.querySelector('.block.rng textarea');
			await new Promise(resolve => window.setTimeout(resolve, 500));
		}

		this.doc = rngEditor.value;
		rngEditor.addEventListener('change', () => this.doc = rngEditor!.value);
	},
	watch: {
		doc() {
			if (this.doc) {
				const nonce = ++this.nonce; // nonce so we don't apply stale data when a new edit happens before we're done processing the previous one.
				simplify.simplify(this.doc).then(r => {
					if (nonce === this.nonce) this.simplified = r;
				});
			}
		},
		xema: {
			immediate: true, 
			handler() {
				Vue.nextTick(() => {
					console.log('resizing');
					const el = document.getElementById('xematree') as HTMLElement;
					el.style.height = (el.scrollHeight + 20) + 'px'
				});
			}
		}
	}
})
</script>