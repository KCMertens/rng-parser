import Vue from 'vue';

import RootComponent from '@/Parser.vue';

import '@/lib/saxon/SaxonJS2.rt.js'; // global saxonjs


Vue.config.productionTip = false;

(window as any).mountEditor = function(el: HTMLElement) {
	new RootComponent().$mount(el);
}