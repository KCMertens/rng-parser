<template>
	<div>
		<pre v-if="formattedXml" style="overflow: auto; max-height: 500px; max-width: 100%;">{{formattedXml}}</pre>

		<div class="error" v-for="e in error" v-if="e" :key="e">{{e}}</div>
		<!-- <Parser v-if="doc" :doc="parsedXml"/> -->
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import format from 'xml-formatter';
import { simplify } from './simplify';

// import Parser from './Parser.vue';

export default Vue.extend({
	// components: { Parser },
	data: () => ({
		originalXml: '',
		error: [] as Array<string|null>,
	}),
	created() {
		const el = document.querySelector('.rng textarea')! as HTMLTextAreaElement;
		this.originalXml = el.value;
		el.addEventListener('change', e => {
			this.originalXml = el.value;
		});
	},
	computed: {
		simplifiedXml(): string { try { this.error[0] = null; return simplify(this.originalXml); } catch (e) { this.error[0] = e.message; return ''; }},
		formattedXml(): string { try { this.error[1] = null; return format(this.simplifiedXml, {indentation: ' '}); } catch (e) { this.error[1] = e.message; return ''; }},
		parsedXml(): Document|null { 
			try {
				this.error[2] = null;
				const parser = new DOMParser();
				return parser.parseFromString(this.simplifiedXml, 'application/xml');
			} catch (e) {
				this.error[2] = e.message;
				return null;
			}
		}
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