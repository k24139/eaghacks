/** Repair only the known standalone loader code, leaving embedded payloads intact. */
export function repairInlineAssetTransport(source) {
  const assignment = 'entries[i].url = inlinePayloadPrefix + name;';
  if (!source.includes(assignment)) return source;
  const prepare = 'window.__eagPrepareInlineAssets = function () {';
  const invoke = 'window.__eagPrepareInlineAssets();';
  if (!source.includes(prepare) || !source.includes(invoke)) {
    throw new Error('Unrecognized inline asset loader: refusing a partial transport repair');
  }
  return source.replace(prepare, 'window.__eagPrepareInlineAssets = async function () {')
    .replace(assignment, 'var raw = await decodePayloadAsync(id);\n      entries[i].url = URL.createObjectURL(new Blob([raw], { type: "application/octet-stream" })) + "#eaghacks-inline-" + name;\n      raw = null;')
    .replace(invoke, 'await window.__eagPrepareInlineAssets();')
    // The embedded server worker has its own asset decoder. Preserve that
    // path instead of delegating Blob URLs to its limited XHR wrapper.
    .replaceAll('url.indexOf(\\"eagler-inline-payload://assets.epk\\") !== 0', '(url.indexOf(\\"eagler-inline-payload://assets.epk\\") !== 0 && !url.endsWith(\\"#eaghacks-inline-assets.epk\\"))')
    .replaceAll('url.indexOf(\\"eagler-inline-payload://assets.epk\\") === 0', '(url.indexOf(\\"eagler-inline-payload://assets.epk\\") === 0 || url.endsWith(\\"#eaghacks-inline-assets.epk\\"))');
}

export function removeExistingIntegration(source) {
  const script = /<script id="eaghacks-integration">[\s\S]*?<\/script>/g;
  const hook = /\/\* EaglerHacks preboot: wrap the official eaglercraftXOpts screenChanged hook\. \*\/[\s\S]*?\n\}\)\(\);/g;
  if ((source.match(script) || []).length !== 1 || (source.match(hook) || []).length !== 1) {
    throw new Error('Refresh requires exactly one known integration script and preboot hook');
  }
  return source.replace(script, '').replace(hook, '');
}
