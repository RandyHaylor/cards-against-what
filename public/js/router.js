// Simple hash router.
// #/            -> landing
// #/lobby/CODE  -> player session
// #/host/CODE   -> host shell

export function parseRoute() {
  const hash = window.location.hash || '#/';
  const [path, qs] = hash.replace('#', '').split('?');
  const parts = path.split('/').filter(Boolean);
  const params = Object.fromEntries(new URLSearchParams(qs || ''));

  if (parts[0] === 'lobby' && parts[1]) {
    return { page: 'player', code: parts[1], params };
  }
  if (parts[0] === 'host' && parts[1]) {
    return { page: 'host', code: parts[1], params };
  }
  return { page: 'landing', code: null, params };
}

export function navigate(path) {
  window.location.hash = path;
}

export function onRouteChange(callback) {
  window.addEventListener('hashchange', () => callback(parseRoute()));
  callback(parseRoute());
}
