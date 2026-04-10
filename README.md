# Torrentio Brazuca - Fork com Providers Brasileiros

Fork do Torrentio com suporte completo aos **providers brasileiros** do addon "Brazuca Torrents" para Stremio.

## 🚀 Deploy Automático

Este projeto está configurado para **deploy automático via GitHub Actions**:

1. **Adicione o secret `VERCEL_TOKEN`** em: `https://github.com/Chriscodef/torrentio-brazuca/settings/secrets/actions`
2. **GitHub Actions fará deploy automático** toda vez que você faz push
3. Addon estará disponível em: `https://torrentio-brazuca-addon.vercel.app/brazuca/manifest.json`

## 📺 O que é Torrentio?

Torrentio é um addon poderoso para o Stremio que:
- Busca torrents de vários provedores em tempo real
- Integra-se com serviços de debrid (Real Debrid, Premiumize, All Debrid, etc.)
- Fornece streams de alta qualidade para filmes, séries e anime
- Oferece filtros avançados por qualidade, tamanho, idioma e provider

## 🇧🇷 Providers Brasileiros

Este fork inclui **8 providers brasileiros**:

### Novos Providers Adicionados:
- **ApacheTorrent** - Archive de torrents brasileiros
- **BaixaFilmesTorrentHD** - Especializado em filmes HD
- **HDRTorrent** - Conteúdo em HDR e 4K
- **RedeTorrent** - Rede ampla de conteúdo local
- **VacaTorrent** - Comunidade ativa brasileira

### Providers Existentes (Reutilizados):
- **Comando** (Portugal 🇵🇹) - BD disponível
- **BluDV** (Portugal 🇵🇹) - BD disponível
- **NyaaSi** - Anime

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    Stremio App                          │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│     Torrentio Addon (Port 7000)                         │
│  - Valida requisições do Stremio                        │
│  - Aplica filtros (qualidade, provider, idioma)         │
│  - Integra com debrid services                          │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│         PostgreSQL Database                             │
│  - tabela: torrents (dados de torrents)                 │
│  - tabela: files (mapeamento de arquivos)               │
│  - tabela: subtitles (legendas)                         │
└────────────────▲────────────────────────────────────────┘
                 │
┌────────────────┴────────────────────────────────────────┐
│     Scraper Service (Agendado via Cron)                │
│  - ApacheTorrent                                        │
│  - BaixaFilmesTorrentHD                                 │
│  - HDRTorrent                                           │
│  - RedeTorrent                                          │
│  - VacaTorrent                                          │
│  (Scraping em paralelo a cada 6 horas)                  │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start (Local)

### Pré-requisitos
- Docker & Docker Compose
- Git
- Porta 7000 disponível

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/torrentio-brazuca.git
cd torrentio-brazuca
```

### 2. Configure as variáveis de ambiente
```bash
cp scraper/.env.example scraper/.env
# Edite scraper/.env conforme necessário
```

### 3. Inicie todos os serviços
```bash
docker-compose up -d
```

Isso iniciará:
- PostgreSQL na porta 5432
- Redis na porta 6379
- Addon Torrentio na porta 7000
- Catalogs na porta 7001
- Scraper (rodará automaticamente a cada 6 horas)

### 4. Verifique o status
```bash
docker-compose ps
docker-compose logs -f addon
docker-compose logs -f scraper
```

### 5. Configure no Stremio

#### Opção A: Usar a configuração Brazuca pré-definida
```
http://localhost:7000/brazuca/manifest.json
```

Isso carrega automaticamente todos os 8 providers brasileiros com filtros de idioma português.

#### Opção B: Configuração personalizada
```
http://localhost:7000/lite/manifest.json
```

## ☁️ Deploy na Nuvem (Render.com)

### Pré-requisitos
- Conta no [Render.com](https://render.com)
- GitHub account conectada ao Render

### 1. Fork este repositório para sua conta do GitHub

### 2. Conecte no Render.com
- Abra [dashboard.render.com](https://dashboard.render.com)
- Clique em "New" → "Blueprint"
- Selecione seu repositório

### 3. O `render.yaml` configurará automaticamente:
- **PostgreSQL Database** - 50GB starter plan
- **Redis Cache** - Starter plan
- **Addon Web Service** - Porta 10000
- **Scraper Service** - Roda "hidden" a cada 4 horas
- **Catalogs Service** - Porta 10000

### 4. Variáveis de Ambiente Necessárias
O Render vai pedir:
- `POSTGRES_PASSWORD` - Senha do banco de dados
- `DATABASE_URL` - Gerada automaticamente
- `REDIS_URL` - Gerada automaticamente

### 5. Deploy
- Clique "Create Blueprint"
- Espere ~10-15 minutos
- Seu addon estará disponível em: `https://seu-servico.onrender.com`

## 🎛️ Configurações Disponíveis

### URL de Configuração Predefinidas
- `/lite/manifest.json` - Apenas providers internacionais (sem localização)
- `/brazuca/manifest.json` - Todos os 8 providers brasileiros + português padrão

### Filtros Personalizados
Você pode criar qualquer configuração customizada:

```
https://seu-addon/PROVIDERS,QUALIDADE,IDIOMA/manifest.json
```

Exemplos:
- `https://localhost:7000/apachetorrent,baixafilmeshd,hdrtorrent/manifest.json` - Apenas 3 providers
- `https://localhost:7000/brazuca/manifest.json?qualityfilter=1080p,720p` - Brazuca + 1080p/720p apenas

### Filtros de Qualidade
- `1080p`, `720p`, `480p`, `4k`
- `brremux` - BluRay REMUX
- `hdrall` - HDR/HDR10+/Dolby Vision
- `cam`, `scr` - Cam/Screener
- `other` - Outros (DVDRip, HDRip, BDRip, etc.)

## 📝 Estrutura de Pastas

```
torrentio-brazuca/
├── addon/                    # Addon Stremio (consumidor de dados)
│   ├── addon.js
│   ├── lib/
│   │   ├── filter.js        # Listagem de providers (MODIFICADO: +5 providers 🇧🇷)
│   │   ├── configuration.js # Presets (MODIFICADO: brazuca agora com 🇧🇷)
│   │   └── ...
│   ├── moch/                # Integrações debrid
│   └── package.json
│
├── scraper/                 # NOVO: Serviço de scraping
│   ├── providers/
│   │   ├── apache-torrent.js
│   │   ├── baixa-filmes.js
│   │   ├── hdr-torrent.js
│   │   ├── rede-torrent.js
│   │   ├── vaca-torrent.js
│   │   └── base-scraper.js
│   ├── utils/
│   │   ├── db-helper.js     # Operações com PostgreSQL
│   │   ├── parser.js        # Parsing de títulos
│   │   └── logger.js        # Logging estruturado
│   ├── index.js             # Orchestrator principal
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
│
├── catalogs/                # Serviço de catálogos
│   └── ...
│
├── docker-compose.yml       # NOVO: Orquestração local
├── render.yaml              # NOVO: Deploy na nuvem
└── README.md                # Este arquivo
```

## 🔧 Desenvolvimento

### Adicionar um novo provider

1. **Crie o scraper** em `scraper/providers/meu-provider.js`:
```javascript
import { BaseScraper } from '../utils/base-scraper.js';

export class MeuProviderScraper extends BaseScraper {
  constructor() {
    super('meuprovider', 'Meu Provider');
    this.baseUrl = 'https://example.com';
  }

  async scrapeMovies(page = 1) {
    // Implementar scraping aqui
  }

  async scrapeSeries(page = 1) {
    // Implementar scraping aqui
  }
}
```

2. **Registre em** `scraper/index.js`:
```javascript
import { MeuProviderScraper } from './providers/meu-provider.js';

// ...
this.scrapers = [
  new ApacheTorrentScraper(),
  // Add new scraper here
  new MeuProviderScraper(),
  // ...
];
```

3. **Adicione ao addon** em `addon/lib/filter.js`:
```javascript
{
  key: 'meuprovider',
  label: 'Meu Provider',
  foreign: '🇧🇷'  // ou seu país
}
```

## 📊 Monitoramento

### Logs do Docker
```bash
# Addon
docker-compose logs -f addon

# Scraper
docker-compose logs -f scraper

# PostgreSQL
docker-compose logs -f postgres
```

### Status do Scraper
O scraper roda automaticamente conforme configurado em `SCRAPER_INTERVAL` (padrão: a cada 6 horas).

Para forçar imediatamente:
```bash
docker-compose exec scraper node scrape.js
```

### Verificar dados no banco
```bash
docker-compose exec postgres psql -U torrentio -d torrentio

# Dentro do psql:
SELECT COUNT(*) FROM torrents;
SELECT COUNT(*) FROM torrents WHERE provider = 'apachetorrent';
```

## 🐛 Troubleshooting

### Addon não conecta ao banco
```bash
# Verifique a conexão PostgreSQL
docker-compose exec postgres psql -U torrentio -d torrentio -c "SELECT 1"
```

### Scraper não encontra torrents
- Verifique os URLs dos sites em `scraper/providers/*.js` (podem estar desatualizados)
- Veja os logs: `docker-compose logs scraper`
- Teste manualmente: `curl http://site-torrent.com`

### Porta 7000 já está em uso
```bash
# Mude em docker-compose.yml:
ports:
  - "7001:7000"  # localhost:7001 → container:7000
```

## 📚 Recursos

- [Stremio Addon SDK](https://github.com/Stremio/stremio-addon-sdk)
- [Sequelize ORM](https://sequelize.org/)
- [Cheerio - jQuery for Node](https://cheerio.js.org/)

## 📄 Licença

MIT

## 🤝 Contribuindo

1. Faça um fork
2. Crie uma branch (`git checkout -b feature/melhoria`)
3. Commit suas mudanças (`git commit -am 'Add feature'`)
4. Push para a branch (`git push origin feature/melhoria`)
5. Abra um Pull Request

## ⚠️ Disclaimer

Este projeto é fornecido "como está". O uso de torrents peut ser illegal em sua jurisdição. Sempre respeite as leis locais e os direitos de propriedade intelectual.
