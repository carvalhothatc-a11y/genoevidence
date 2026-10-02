# Publicar o GenoLab numa VPS

Roteiro para colocar o GenoLab no ar com **Docker + Caddy (HTTPS automático)** numa VPS.
Os dados (contas, projetos, arquivos originais, auditoria) ficam num volume Docker no disco da VPS.

> Nada aqui foi executado: a publicação depende de você contratar a VPS e o domínio.
> A imagem foi preparada e a versão de produção foi compilada e testada localmente
> (`next build` + servidor autocontido); o Docker em si só poderá ser testado na VPS.

## 1. O que contratar

| Item | Recomendação |
|---|---|
| VPS | Ubuntu 24.04 LTS, **2 GB de RAM** ou mais (a compilação do Next.js usa memória; com 1 GB, crie 2 GB de swap), 20 GB de disco |
| Região | De preferência **no Brasil** (dados de pesquisa e LGPD); confirme a disponibilidade no provedor |
| Domínio | Um subdomínio para o lab, por exemplo `lab.seudominio.com.br` |

## 2. DNS

No painel do seu domínio, crie um registro **A** do subdomínio apontando para o **IP da VPS**.
O HTTPS só funciona depois que o DNS estiver propagado.

## 3. Preparar a VPS (uma vez)

```bash
# acesso por chave SSH; depois:
sudo apt update && sudo apt upgrade -y
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # saia e entre de novo no SSH
```

## 4. Baixar o código

```bash
sudo mkdir -p /opt/genolab && sudo chown $USER /opt/genolab
git clone https://github.com/carvalhothatc-a11y/genoevidence.git /opt/genolab
cd /opt/genolab && git checkout genoevidence-lab   # até o PR ser mesclado no main
cd _genoevidence-lab
```

## 5. Configurar (segredos só na VPS)

```bash
cp .env.production.example .env.production
nano .env.production      # domínio em LAB_ALLOWED_ORIGINS, e-mail da administração, chave do Geninho
chmod 600 .env.production
echo "GENOLAB_DOMINIO=lab.seudominio.com.br" > .env   # usado pelo Caddy
```

## 6. Subir

```bash
docker compose up -d --build
docker compose ps
curl -s https://lab.seudominio.com.br/api/saude    # deve responder {"ok":true}
```

## 7. Primeiro acesso

1. Abra `https://lab.seudominio.com.br/cadastro` e cadastre-se com o e-mail de `GENO_LAB_ADMIN_EMAILS` (já nasce autorizado e administrador).
2. Novas contas ficam pendentes até você aprovar em **Administração**.

## 8. Ligar o site GenoEvidence ao lab

No repositório do site, edite `data/lab.json` e troque `"url"` para `https://lab.seudominio.com.br`. Publique o site normalmente.

## 9. Backups (obrigatório)

```bash
sudo crontab -e
# adicionar a linha (todo dia às 3h15):
15 3 * * * /opt/genolab/_genoevidence-lab/deploy/backup.sh
```

- Os arquivos ficam em `/opt/genolab-backups` por 14 dias.
- **Teste a restauração** pelo menos uma vez e copie backups periodicamente para fora da VPS.
- Restaurar: pare o app (`docker compose stop app`), extraia o `.tar.gz` no volume `genolab-dados` e suba de novo.

## 10. Atualizar e acompanhar

```bash
cd /opt/genolab && git pull && cd _genoevidence-lab && docker compose up -d --build
docker compose logs -f app        # registros do app (sem conteúdo de pesquisa)
```

## Antes de abrir para outras pessoas

- [ ] HTTPS ativo e redirecionamento de http para https (o Caddy faz sozinho).
- [ ] Só e-mails de confiança em `GENO_LAB_ADMIN_EMAILS`.
- [ ] Backups agendados e restauração testada.
- [ ] Política de privacidade e termos de uso (LGPD) publicados.
- [ ] Pendências de segurança conhecidas: política de conteúdo (CSP) com nonce ainda não aplicada;
      arquivos enviados não passam por antivírus; limites de requisição ficam em memória
      (valem para uma única instância do app).
- [ ] Geninho: a chave fica só no `.env.production`; usar uma chave de workspace ou informar `ANTHROPIC_WORKSPACE_ID`.
