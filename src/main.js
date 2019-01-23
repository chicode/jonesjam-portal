import _ from 'lodash/fp'
import Vue from 'vue'

import prepare from './rest'
import endpoints from './endpoints'
import './globals'

import store from './store'
import router from './router'
import App from './App.vue'

import './styles/index.scss'

Vue.config.productionTip = false

const { methods, install } =
  _.merge(
    {
      root: '[[API]]',
    },
    endpoints,
  ) |> prepare

Vue.use(install)

new Vue({
  router,
  store,
  render: (h) => h(App),
}).$mount('#app')
