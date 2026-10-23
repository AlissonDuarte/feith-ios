/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'widget',
  name: 'VerseWidget',
  displayName: 'Versículo do dia',
  deploymentTarget: '17.0',
  frameworks: ['SwiftUI', 'WidgetKit'],
  bundleIdentifier: '.widget',
  // Objeto vazio de proposito: e o gatilho que faz o plugin espelhar
  // ios.entitlements['com.apple.security.application-groups'] do app
  // principal neste target (ver with-widget.js — so mirra se `entitlements`
  // for truthy, mesmo vazio).
  entitlements: {},
  colors: {
    $widgetBackground: '#FAF8F4',
  },
};
