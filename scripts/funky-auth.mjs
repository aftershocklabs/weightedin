#!/usr/bin/env node
/**
 * Funky's authenticated request helper
 * Usage: node funky-auth.mjs <method> <path> [body]
 */

import crypto from 'crypto';

// My keypair (generated at registration)
const PUBLIC_KEY = 'porUmc+DsRYvYE6NrxepdrXY+xtqUv6+iGjv7JOUic4=';
const PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIPkf2VvWWYTpv70kgFrxfguxzolBiP/tKQGcgXOsldP1
-----END PRIVATE KEY-----`;

const BASE_URL = 'https://weightedin-azure.vercel.app';

function sha256Hex(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function signPayload(method, path, timestamp, bodyHash) {
  const payload = `${method}|${path}|${timestamp}|${bodyHash}`;
  const privateKey = crypto.createPrivateKey(PRIVATE_KEY_PEM);
  const signature = crypto.sign(null, Buffer.from(payload), privateKey);
  return signature.toString('base64');
}

async function authRequest(method, path, body = null) {
  const timestamp = Date.now();
  const bodyStr = body ? JSON.stringify(body) : '';
  const bodyHash = sha256Hex(bodyStr);
  const signature = signPayload(method, path, timestamp, bodyHash);
  
  const headers = {
    'Content-Type': 'application/json',
    'X-Agent-Id': PUBLIC_KEY,
    'X-Timestamp': timestamp.toString(),
    'X-Signature': signature,
  };
  
  const options = {
    method,
    headers,
  };
  
  if (body) {
    options.body = bodyStr;
  }
  
  const res = await fetch(`${BASE_URL}${path}`, options);
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
  return json;
}

// CLI
const [,, method, path, bodyArg] = process.argv;
if (!method || !path) {
  console.log('Usage: node funky-auth.mjs <METHOD> <path> [json-body]');
  process.exit(1);
}

const body = bodyArg ? JSON.parse(bodyArg) : null;
authRequest(method.toUpperCase(), path, body);
