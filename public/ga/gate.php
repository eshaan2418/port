<?php
// Analytics gate (see lib/analytics.ts and README → Analytics).
// Answers {"analytics":true} only where GA4 may run without prior consent:
// the United States, and Canada outside Quebec. Everything else, including an
// unknown country or province, gets false. Reads Hostinger GeoIP (country +
// province only); stores nothing, logs nothing, never echoes the IP.
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, no-store, max-age=0');
header('X-Robots-Tag: noindex');

function geo($key) {
  $v = getenv($key);
  if ($v === false || $v === '') $v = $_SERVER[$key] ?? '';
  return strtoupper(trim((string) $v));
}

$country = geo('GEOIP_COUNTRY_CODE');
$region = geo('GEOIP_REGION');

// Canada: an allowlist of provinces/territories, so Quebec (QC) and anything
// unrecognised (no region, an old numeric code) stay blocked
$canada = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'SK', 'YT'];

$allowed = $country === 'US' || ($country === 'CA' && in_array($region, $canada, true));

echo $allowed ? '{"analytics":true}' : '{"analytics":false}';
