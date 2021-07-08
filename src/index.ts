import Vue from 'vue';

import RootComponent from '@/Editor.vue';

Vue.config.productionTip = false;

(window as any).mountEditor = function(el: HTMLElement) {
	new RootComponent().$mount(el);
}