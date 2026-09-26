#!/bin/sh
# Sobe a versão em todo lugar e carimba os arquivos no index.
# Sem o carimbo, o navegador guarda o .js por 10 minutos (Cache-Control do
# GitHub Pages) e a versão nova não chega, mesmo limpando o service worker.
# Uso: ./publicar.sh 1.27.0
set -e
[ -n "$1" ] || { echo "uso: ./publicar.sh 1.27.0"; exit 1; }
V="b12-v$1"
cd "$(dirname "$0")"
sed -i '' "s/const CACHE = 'b12-v[0-9.]*';/const CACHE = '$V';/" sw.js
sed -i '' "s/B12.VERSAO = 'b12-v[0-9.]*'/B12.VERSAO = '$V'/" dados.js
# carimba todo .js e .css local do index
python3 - "$1" <<'PY'
import re, sys
v = sys.argv[1]
h = open('index.html').read()
h = re.sub(r'(src|href)="([a-z0-9_-]+\.(?:js|css))(\?v=[0-9.]+)?"', lambda m: '%s="%s?v=%s"' % (m.group(1), m.group(2), v), h)
open('index.html','w').write(h)
print('carimbados:', len(re.findall(r'\?v=' + re.escape(v), h)), 'arquivos')
PY
grep -o "b12-v[0-9.]*" sw.js | head -1
