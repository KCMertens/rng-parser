import Vue from 'vue';

import RootComponent from '@/Editor.vue';

import '@/SaxonJS2.rt.js'; // global saxonjs

Vue.config.productionTip = false;

(window as any).mountEditor = function(el: HTMLElement) {
	new RootComponent().$mount(el);
}