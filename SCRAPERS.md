# 📚 Documentação de Scrapers

Guia detalhado para entender e customizar os scrapers de providers brasileiros.

## Arquitetura Base

### Classe BaseScraper

Todos os scrapers herdam de `BaseScraper` que fornece:

```javascript
import { BaseScraper } from '../utils/base-scraper.js';

export class MyProviderScraper extends BaseScraper {
  constructor() {
    super('providerkey', 'Provider Display Name');
    this.baseUrl = 'https://example.com';
  }

  async scrapeMovies(page = 1) { }
  async scrapeSeries(page = 1) { }
}
```

### Métodos Disponíveis

#### `fetchPage(url, retries = 0)`
Faz requisição HTTP com:
- User-Agent dinamicamente rotacionado
- Retry automático (até 3 vezes por padrão)
- Headers para parecer navegador de verdade
- Timeout de 10s

```javascript
const html = await this.fetchPage('https://example.com/filmes');
```

#### `generateInfoHash(title, date)`
Cria identificador único (SHA1) para o torrent

#### `parseTorrentTitle(title)`
Extrai metadados do título:
```javascript
{
  title: 'The Matrix 1999 1080p',
  year: 1999,
  resolution: '1080p',
  isSeries: false,
  isAnime: false
}
```

#### `extractSize(sizeStr)`
Converte tamanho para bytes:
```javascript
extractSize('2.5 GB') // → 2684354560
```

#### `normalizeTorrent(torrentData)`
Padroniza dados do torrent para salvar no banco:
```javascript
{
  infoHash: 'abc123...',
  provider: 'apachetorrent',
  title: 'The Matrix 1999 1080p BluRay',
  type: 'movie',
  seeders: 150,
  size: 2684354560,
  uploadDate: Date,
  resolution: '1080p',
  languages: 'portuguese'
}
```

## Providers Implementados

### 1. ApacheTorrent

**URL Base**: `https://apachetorrent.com`

**Páginas**:
- Filmes: `/filmes?page={page}`
- Séries: `/series?page={page}`

**Seletores esperados**:
```html
<div class="torrent-item">
  <a class="title">Filme 1080p</a>
  <span class="seeds">150</span>
  <span class="size">2.5 GB</span>
  <span class="date">2024-01-15</span>
</div>
```

---

### 2. BaixaFilmesTorrentHD

**URL Base**: `https://baixafilmes.net`

**Páginas**:
- Filmes: `/filmes?p={page}`
- Séries: `/series?p={page}`

**Particularidades**:
- Datas em português ("2 dias atrás")
- Tamanhos em formato customizado

---

### 3. HDRTorrent

**URL Base**: `https://hdtorrent.com.br`

**Páginas**:
- Filmes: `/browse?c=2:1&p={page}`
- Séries: `/browse?c=2:2&p={page}`

**Estrutura**: Tabela tradicional de torrent sites
```html
<tr class="forum_header_border">
  <td><a href="/torrent/123">Título</a></td>
  <td>...</td>
  <td>Data</td>
  <td>Tamanho</td>
  <td>Seeders</td>
</tr>
```

---

### 4. RedeTorrent

**URL Base**: `https://www.rede-torrent.org`

**Páginas**:
- Filmes: `/index.php?order=categoria&cat=1&page={page}`
- Séries: `/index.php?order=categoria&cat=2&page={page}`

**Particularidades**:
- Datas em português ("hoje", "ontem")
- Info em divs aninhadas

---

### 5. VacaTorrent

**URL Base**: `https://www.vacatorrent.com`

**Páginas**:
- Filmes: `/filmes?page={page}`
- Séries: `/series?page={page}`

**Estrutura**: Cards modernos
```html
<article data-type="movie">
  <h3><a href="#">Título</a></h3>
  <span class="seeds">150</span>
  <span class="size">2.5 GB</span>
  <time datetime="2024-01-15"></time>
</article>
```

---

## Utilities

### parser.js

Funções de parsing e extração:

#### `extractQuality(title)`
Detecta qualidade:
```javascript
extractQuality('Matrix 1080p BluRay') // '1080p'
extractQuality('Filme CAM') // 'cam'
```

Valores possíveis:
- `4k`, `2160p`, `1080p`, `720p`, `480p`, `360p`
- `bluray`, `brrip`, `web-dl`, `webrip`, `hdrip`, `dvdrip`
- `cam`, `telesync`, `scr`, `hdtv`

#### `extractSize(sizeStr)`
```javascript
extractSize('2.5 GB') // 2684354560 (bytes)
```

#### `extractYear(title)`
```javascript
extractYear('The Matrix (1999)') // 1999
```

#### `extractSeasonEpisode(title)`
```javascript
extractSeasonEpisode('Breaking Bad S01E05')
// { season: 1, episode: 5 }
```

#### `isSeries(title)`
```javascript
isSeries('Serie S01E05') // true
```

#### `isAnime(title)`
```javascript
isAnime('Anime [SubID] [BD]') // true
```

### db-helper.js

Operações de banco de dados:

#### `upsertTorrent(torrentData)`
Cria ou atualiza torrent:
```javascript
const torrent = await upsertTorrent({
  infoHash: 'abc123...',
  provider: 'apachetorrent',
  title: 'The Matrix 1999 1080p',
  type: 'movie',
  seeders: 150,
  size: 2684354560,
  uploadDate: new Date(),
  languages: 'portuguese'
});
```

#### `bulkUpsertTorrents(torrents)`
Operação em lote:
```javascript
const result = await bulkUpsertTorrents([
  { infoHash, provider, title, ... },
  { infoHash, provider, title, ... }
]);
// { created: 10, updated: 5, failed: 0 }
```

#### `getTorrentsByProvider(provider, limit)`
Consulta ao banco:
```javascript
const torrents = await getTorrentsByProvider('apachetorrent', 100);
```

---

## Estrutura de Dados

### Modelo Torrent

```javascript
{
  infoHash: STRING(64) - Primary Key, identificador único
  provider: STRING(32) - qual provider
  torrentId: STRING(128) - ID externo (opcional)
  title: STRING(256) - título do torrent
  type: STRING(16) - 'movie', 'series', 'anime'
  size: BIGINT - tamanho em bytes
  uploadDate: DATE - quando foi publicado
  seeders: SMALLINT - número de seeders
  trackers: STRING(4096) - lista de trackers
  languages: STRING(4096) - idiomas (ex: 'portuguese')
  resolution: STRING(16) - qualidade (ex: '1080p')
}
```

### Modelo File

Usado para vincular à IMDB/Kitsu:

```javascript
{
  id: BIGINT - Primary Key
  infoHash: STRING(64) - Foreign Key → Torrent
  fileIndex: INTEGER - índice do arquivo
  title: STRING(256) - nome do arquivo
  size: BIGINT
  imdbId: STRING(32) - ex: 'tt0133093' (matriz)
  imdbSeason: INTEGER
  imdbEpisode: INTEGER
  kitsuId: INTEGER - para anime
  kitsuEpisode: INTEGER
}
```

---

## Exemplo: Criar novo Scraper

```javascript
// scraper/providers/novo-site.js
import { BaseScraper } from '../utils/base-scraper.js';
import { logger } from '../utils/logger.js';
import { upsertTorrent } from '../utils/db-helper.js';
import { parseTorrentTitle, extractSize } from '../utils/parser.js';
import cheerio from 'cheerio';

export class NovoSiteScraper extends BaseScraper {
  constructor() {
    super('novosite', 'Novo Site');
    this.baseUrl = 'https://novosite.com.br';
  }

  async scrapeMovies(page = 1) {
    try {
      const url = `${this.baseUrl}/filmes?page=${page}`;
      const html = await this.fetchPage(url);
      const $ = cheerio.load(html);

      const torrents = [];

      $('div.movie-item').each((idx, elem) => {
        try {
          const title = $(elem).find('h2').text().trim();
          const seedsStr = $(elem).find('.seeds').text();
          const sizeStr = $(elem).find('.size').text();
          const dateStr = $(elem).find('.date').text();

          if (!title) return;

          const parsed = parseTorrentTitle(title);

          torrents.push({
            title,
            infoHash: this.generateInfoHash(title, dateStr),
            type: 'movie',
            seeders: parseInt(seedsStr) || 0,
            size: extractSize(sizeStr),
            uploadDate: new Date(dateStr),
            resolution: parsed.quality,
            languages: 'portuguese'
          });
        } catch (e) {
          logger.warn(`Erro parsing item`, { error: e.message });
        }
      });

      logger.info(`Scraped ${torrents.length} filmes`, { page });
      return torrents;
    } catch (error) {
      logger.error(`Erro ao scrape`, { error: error.message });
      return [];
    }
  }

  async scrapeSeries(page = 1) {
    // Similar a scrapeMovies, mas para séries
  }

  async batchSave(torrents) {
    for (const torrent of torrents) {
      try {
        const normalized = this.normalizeTorrent(torrent);
        await upsertTorrent(normalized);
      } catch (e) {
        logger.error(`Erro salvando torrent`, {
          title: torrent.title,
          error: e.message
        });
      }
    }
  }
}
```

---

## Dicas de Debugging

### 1. Teste o URL
```bash
curl 'https://apachetorrent.com/filmes?page=1' \
  -H 'User-Agent: Mozilla/5.0'
```

### 2. Inspect HTML
```javascript
const html = await this.fetchPage(url);
console.log(html.substring(0, 1000)); // primeiros 1000 chars
```

### 3. Use CheerioJS interativamente
```javascript
import cheerio from 'cheerio';
const $ = cheerio.load(html);
console.log($('div.movie-item:first').html());
```

### 4. Logs estruturados
```javascript
// logger.js disponibiliza
logger.info(message, metadata);
logger.warn(message, metadata);
logger.error(message, metadata);
logger.debug(message, metadata);
```

### 5. Monitore em tempo real
```bash
docker-compose logs -f scraper | grep novosite
```

---

## Rate Limiting & Courtesy

Cada scraper implementa:
- Delay de 1 segundo entre páginas
- User-Agent rotacionado
- Timeout de 10 segundos
- Retry automático com backoff exponencial

```javascript
// Cortesia: espere entre requisições
await scraper.delay(1000);
```

---

## Performance

### Otimizações
- Scraping em paralelo para múltiplos providers
- Upsert em batch (mais rápido que inserts individuais)
- Seletures CSS eficientes (evite querySelectorAll aninhados)
- Regex pré-compilado para parsing

### Limites
- Max 5 páginas por provider (padrão, configurável)
- Max 1000 torrents por rodada por provider
- Timeout: 10s por requisição HTTP

---

## Troubleshooting

### "Failed to fetch"
- Site pode estar offline
- Cloudflare/WAF bloqueando
- Tente headers diferentes em `BaseScraper.getRandomUserAgent()`

### "No torrents found"
- Seletores CSS desatualizados (site mudou de design)
- Inspecione novo HTML com `curl` + Cheerio

### "Database error"
- Verifique conexão: `docker-compose exec postgres psql -U torrentio`
- Schema pode estar fora de sync: remova volumes e recrie

---

## Contribuindo

Para adicionar um novo provider Brazilian:
1. Crie `scraper/providers/seu-provider.js`
2. Implemente `scrapeMovies()` e `scrapeSeries()`
3. Registre em `scraper/index.js`
4. Adicione ao `addon/lib/filter.js`
5. Teste localmente: `docker-compose up`
6. Submeta PR!
