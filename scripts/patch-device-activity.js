/**
 * Corrige o `sendHttpRequest` do react-native-device-activity (0.6.1).
 *
 * O Shared.swift da lib é copiado para as extensions (ShieldAction etc.) no
 * prebuild, então o conserto precisa estar no node_modules — editar as cópias
 * em targets/ não sobrevive. Dois bugs faziam o botão "Pagar e liberar" do
 * escudo nunca chegar à API (nenhum recibo `app:` jamais foi gravado):
 *
 *  1. o Swift lê `config["httpMethod"]`, mas o tipo TS documenta `method` —
 *     a requisição saía como GET (404 em /tracking/unlock);
 *  2. `request.allHTTPHeaderFields?.merging(...)` parte de nil numa URLRequest
 *     nova, então nenhum header era aplicado (sem Authorization → 401).
 *
 * Idempotente: roda no postinstall e não faz nada se já estiver aplicado.
 * Sem dependência de propósito (patch-package exigiria rede no install).
 */
const fs = require('fs');
const path = require('path');

const file = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-device-activity',
  'ios',
  'Shared.swift',
);

const replacements = [
  {
    from: '  if let httpMethod = config["httpMethod"] as? String {',
    to:
      '  // the TS type documents `method`; `httpMethod` kept for compatibility\n' +
      '  if let httpMethod = (config["method"] ?? config["httpMethod"]) as? String {',
  },
  {
    from:
      '    // merge with existing headers\n' +
      '    request.allHTTPHeaderFields = request.allHTTPHeaderFields?.merging(\n' +
      '      headersWithPlaceholders, uniquingKeysWith: { $1 })\n',
    to:
      '    // a fresh URLRequest has nil header fields: `nil?.merging` dropped every header\n' +
      '    for (field, value) in headersWithPlaceholders {\n' +
      '      request.setValue(value, forHTTPHeaderField: field)\n' +
      '    }\n',
  },
];

if (!fs.existsSync(file)) {
  console.warn('[patch-device-activity] lib não encontrada, nada a fazer');
  process.exit(0);
}

let source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
let changed = 0;
for (const { from, to } of replacements) {
  if (source.includes(to)) continue;
  if (!source.includes(from)) {
    // versão nova da lib mudou o trecho: falhar alto é melhor que build quebrada em silêncio
    console.error('[patch-device-activity] trecho esperado não encontrado — revise o patch');
    process.exit(1);
  }
  source = source.replace(from, to);
  changed++;
}

if (changed > 0) fs.writeFileSync(file, source);
console.log(`[patch-device-activity] ${changed ? `${changed} correção(ões) aplicada(s)` : 'já aplicado'}`);
