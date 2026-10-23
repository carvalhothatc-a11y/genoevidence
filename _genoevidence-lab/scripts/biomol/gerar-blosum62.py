"""Gera src/lib/biomol/blosum62.ts a partir da matriz oficial do NCBI.

Uso:
    curl -sS -o BLOSUM62 https://ftp.ncbi.nlm.nih.gov/blast/matrices/BLOSUM62
    python3 scripts/biomol/gerar-blosum62.py BLOSUM62 src/lib/biomol/blosum62.ts
"""
import sys, hashlib
raw = open(sys.argv[1]).read()
lines = [l for l in raw.splitlines() if l.strip() and not l.startswith('#')]
cols = lines[0].split()
rows = []
for l in lines[1:]:
    p = l.split()
    assert p[0] == cols[len(rows)]
    rows.append([int(x) for x in p[1:]])
assert len(rows) == len(cols) == 24
for i in range(24):
    for j in range(24):
        assert rows[i][j] == rows[j][i]
sha = hashlib.sha256(raw.encode()).hexdigest()[:16]
out = ['/**',
 ' * Matriz BLOSUM62 do NCBI, GERADA a partir de https://ftp.ncbi.nlm.nih.gov/blast/matrices/BLOSUM62',
 ' * (baixada em 2026-10-23, sha256 ' + sha + '…). Henikoff & Henikoff, PNAS 1992;89:10915-9.',
 ' *',
 ' * Não edite à mão. Linhas e colunas na ordem de `LETRAS`; a matriz é simétrica.',
 ' */',
 'export const LETRAS = "%s";' % ''.join(cols),
 '',
 'export const BLOSUM62: readonly (readonly number[])[] = [']
for c, r in zip(cols, rows):
    out.append('  [%s], // %s' % (', '.join('%2d' % x for x in r), c))
out.append('];')
open(sys.argv[2], 'w').write('\n'.join(out) + '\n')
print('ok', ''.join(cols))
