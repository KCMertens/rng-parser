<template>
	<div>
		<!-- <pre v-if="simplifiedXml" style="overflow: auto; max-height: 500px; max-width: 100%;">{{simplifiedXml}}</pre>

		<h2 v-if="loading">Loading, this may take a while...</h2>
		<div class="error" v-for="e in error" v-if="e" :key="e">{{e}}</div> -->
		<Parser v-if="parsedXml" :doc="parsedXml"/>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
// import { simplify } from './simplify';
import Parser from '@/Parser.vue';

import simplified from '../xslt-test/result1.xml';

const parser = new DOMParser();
const parsedXml = parser.parseFromString(simplified, 'text/xml');

export default Vue.extend({
	components: { Parser },
	data: () => ({
		// originalXml: '',
		// simplifiedXml: '',
		// nonce: 0,
		// error: [] as Array<string|null>,
		// loading: false
		parsedXml
	}),
	created() {
		// const el = document.querySelector('.rng textarea')! as HTMLTextAreaElement;
		// this.originalXml = el.value;
		// el.addEventListener('change', e => {
		// 	this.originalXml = el.value;
		// });
	},
	computed: {
		// parsedXml(): Document|null { 
			// if (!this.simplifiedXml) return null;

			// try {
			// 	this.error[1] = null;
			// 	const parser = new DOMParser();
			// 	return parser.parseFromString(this.simplifiedXml, 'application/xml');
			// } catch (e) {
			// 	this.error[1] = e.message;
			// 	return null;
			// }
		// }
	},
	watch: {
		// originalXml() { 
		// 	const id = ++this.nonce;
		// 	if (!this.originalXml) {
		// 		this.simplifiedXml = '';
		// 		return;
		// 	};

		// 	this.loading = true;
		// 	simplify(this.originalXml)
		// 	.then(r => {
		// 		if (this.nonce === id) {
		// 			this.simplifiedXml = r;
		// 			this.error[0] = null;
		// 			this.loading = false;
		// 		}
		// 		else console.warn(`outdated result, id=${id}, nonce=${this.nonce}`);
		// 	})
		// 	.catch(e => {
		// 		this.error[0] = e.message;
		// 	})
		// },
	}
});

</script>

<style lang="scss">

.vue-root {
	border-radius: 4px;
	border: 1px solid #ccc;
	box-shadow: 0 0 1px 3px black;

}
</style>