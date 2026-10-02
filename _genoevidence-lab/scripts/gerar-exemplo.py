"""Gera public/samples/expressao_exemplo_SINTETICO.csv (dados SINTÉTICOS, determinísticos).

Os valores são fictícios e servem apenas para demonstrar importação, validação e gráficos.
Uso: python3 scripts/gerar-exemplo.py
"""
from pathlib import Path

genes = {"GENE_SINT_01": (40.0, 41.5), "GENE_SINT_02": (12.0, 30.5), "GENE_SINT_03": (220.0, 105.0), "GENE_SINT_04": (3.1, 3.4)}
offsets = [-0.06, 0.02, 0.05]
rows = ["gene,amostra,grupo,valor,unidade"]
for g, (c, t) in genes.items():
    for i, o in enumerate(offsets):
        rows.append(f"{g},C{i+1},controle,{round(c*(1+o),2)},TPM")
    for i, o in enumerate(offsets[::-1]):
        val = round(t * (1 + o * 1.5), 2)
        if g == "GENE_SINT_04" and i == 2:
            val = "NA"  # valor ausente proposital
        rows.append(f"{g},T{i+1},tratamento,{val},TPM")
out = Path(__file__).resolve().parent.parent / "public" / "samples" / "expressao_exemplo_SINTETICO.csv"
out.write_text("\n".join(rows) + "\n", encoding="utf-8")
print(f"Gerado: {out}")
