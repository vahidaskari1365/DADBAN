// No-flash theme script executed before first paint to prevent FOUC.
// Kept in a plain (non-client) module so it can be imported by the server layout.
export const noFlashScript = `
(function(){try{
  var t = localStorage.getItem('dadban-theme');
  if(!t){ t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
  var d = document.documentElement;
  d.classList.toggle('dark', t === 'dark');
  d.style.colorScheme = t;
}catch(e){}})();
`;
