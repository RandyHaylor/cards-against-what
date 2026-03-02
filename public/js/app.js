import { onRouteChange } from './router.js';
import { renderLanding } from './pages/landing.js';
import { renderPlayerSession } from './pages/player-session.js';
import { renderHostShell } from './pages/host-shell.js';

const root = document.getElementById('app');
let cleanup = null;

onRouteChange(route => {
  if (cleanup) { cleanup(); cleanup = null; }
  root.innerHTML = '';

  switch (route.page) {
    case 'player':
      cleanup = renderPlayerSession(root, route.code, route.params);
      break;
    case 'host':
      cleanup = renderHostShell(root, route.code, route.params);
      break;
    default:
      renderLanding(root, route.params);
      break;
  }
});
