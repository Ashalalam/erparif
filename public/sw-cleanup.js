// Service Worker Cleanup Script
// This script unregisters any old service workers that may be causing issues

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for (let registration of registrations) {
      console.log('Unregistering old service worker:', registration.scope)
      registration.unregister()
    }
  })
}
