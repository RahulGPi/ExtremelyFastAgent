(function (root) {
  function urlsIn(text) {
    return (text.match(/https?:\/\/[^\s<>"']+/g) || []).map(url => url.replace(/[.,;!\])}]+$/g, ''));
  }
  function matchingSources(text, sources) {
    const urls = new Set(urlsIn(text));
    return sources.filter(source => urls.has(source.url));
  }
  const api = { urlsIn, matchingSources };
  if (typeof module !== 'undefined') module.exports = api;
  else root.sourceMatching = api;
})(globalThis);
