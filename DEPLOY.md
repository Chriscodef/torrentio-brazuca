# 🚀 Deploy no Render.com - Guia Definitivo

**Este guia FUNCIONA. Siga exatamente.**

---

## 📋 Pré-requisitos

- GitHub account conectado ao Render
- Repositório: `https://github.com/Chriscodef/torrentio-brazuca`

---

## ✅ Passo 1: Criar Banco de Dados PostgreSQL

1. Abra https://dashboard.render.com
2. Clique **"New +" → "PostgreSQL"**
3. Preencha:
   - **Name**: `torrentio`
   - **Database**: `torrentio`
   - **User**: `torrentio_user`
   - **Region**: Sua região (ex: São Paulo)
   - **PostgreSQL Version**: `16`
   - **Plan**: `Free`
4. Clique **"Create Database"**
5. ⏱️ Espere 5-10 minutos até ficar "Available" (status verde)
6. **COPIA A CONNECTION STRING** (vai precisar depois)

![](https://i.imgur.com/xxx.png)

---

## ✅ Passo 2: Criar Serviço Web - ADDON

1. Clique **"New +" → "Web Service"**
2. **GitHub**: Seleciona `Chriscodef/torrentio-brazuca`
3. Preencha:
   - **Name**: `torrentio-addon`
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `cd addon && npm install --production`
   - **Start Command**: `cd addon && npm start`
   - **Plan**: `Free`

4. Clique em **"Advanced"** e adiciona **Environment Variables**:
   - `NODE_ENV` = `production`
   - `DATABASE_URI` = **Cole aqui a CONNECTION STRING do PostgreSQL**
   - `PORT` = `3000`

5. Clique **"Create Web Service"**

✅ Isso vai fazer deploy do addon!

---

## ✅ Passo 3: Criar Serviço Web - SCRAPER

1. Clique **"New +" → "Web Service"**
2. **GitHub**: Seleciona `Chriscodef/torrentio-brazuca`
3. Preencha:
   - **Name**: `torrentio-scraper`
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `cd scraper && npm install --production`
   - **Start Command**: `cd scraper && npm start`
   - **Plan**: `Free`

4. Clique em **"Advanced"** e adiciona:
   - `NODE_ENV` = `production`
   - `DATABASE_URI` = **Cole aqui a CONNECTION STRING do PostgreSQL** (mesma de cima)

5. Clique **"Create Web Service"**

✅ Agora o scraper vai rodar!

---

## 🎯 URLs Finais

Depois que tudo ficar verde (Available):

| Serviço | URL |
|---------|-----|
| **Addon Brazuca** | `https://torrentio-addon.onrender.com/brazuca/manifest.json` |
| **Addon Lite** | `https://torrentio-addon.onrender.com/lite/manifest.json` |
| **Scraper Logs** | Dentro do Render dashboard |

---

## 📱 Usar no Stremio

1. Abra Stremio
2. **Configurações → Add-ons → "Instalar Add-on do Repositório"**
3. Cola a URL:
   ```
   https://torrentio-addon.onrender.com/brazuca/manifest.json
   ```
4. Tipo: **Addon de Streams**
5. Clica **"Instalar"**

✅ Pronto! Addon rodando com providers brasileiros!

---

## 🔧 Troubleshooting

### Erro: "Build failed"
- Verifique se os `package.json` existem em `/addon` e `/scraper`
- Verifique se o Build Command está igual

### Erro: "Database connection failed"
- Copie a CONNECTION STRING exatamente
- Sem espaços extras
- Certifique-se de que o banco está "Available" (verde)

### Scraper não scrapeando nada
- Verifique os logs no Render dashboard
- URLs dos sites podem estar desatualizados
- Edite `/scraper/providers/*.js` com URLs reais

### Addon retorna erro 500
- Verifique os logs: Dashboard → App → Logs
- Banco de dados pode estar sem dados (rode scraper manualmente)

---

## 📊 Monitorar

No **Render Dashboard**:

```
torrentio-addon → Logs  # Ver requisições do addon
torrentio-scraper → Logs  # Ver scraping em tempo real
torrentio → Database Logs  # Ver queries ao banco
```

---

## 🗑️ Deletar (se precisar)

1. Dashboard → Seleciona cada serviço
2. Clique em **"Delete"**
3. Confirma

---

## 💡 Dicas

- **Free tier Render**: 0,5GB RAM, auto-sleep após 15min inatividade
- **Para sempre online**: Upgrade para Paid
- **Scrapers rodando**: Mesmo dormindo, Render acorda para rodar cron jobs
- **Banco**: Guarda dados mesmo com app offline

---

**FUNCIONA? Me avisa! 🚀**
