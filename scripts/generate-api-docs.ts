import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

interface OpenAPISpec {
  openapi: string;
  info: { title: string; version: string; description: string };
  servers: Array<{ url: string; description: string }>;
  paths: Record<string, Record<string, { summary: string; tags: string[]; responses: Record<string, { description: string }> }>>;
  tags: Array<{ name: string; description: string }>;
}

// ファイル名→ベースパスの変換
function fileToBasePath(fileName: string): string {
  const name = fileName.replace(/\.ts$/, '');
  if (name.startsWith('ebay-')) {
    return `/api/ebay/${name.replace('ebay-', '')}`;
  }
  return `/api/${name}`;
}

// ファイル名→タグ名の変換
function fileToTag(fileName: string): string {
  const name = fileName.replace(/\.ts$/, '');
  return name
    .split('-')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

// ルーターファイルからエンドポイントを抽出
function extractEndpoints(filePath: string): Array<{ method: string; path: string }> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const regex = /router\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g;
  const endpoints: Array<{ method: string; path: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    endpoints.push({ method: match[1], path: match[2] });
  }
  return endpoints;
}

function ensureDirSync(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function generateSpec(): number {
  // スクリプト位置: <projectRoot>/scripts/generate-api-docs.ts
  // プロジェクトルートを基準に解決
  const projectRoot = path.resolve(__dirname, '../');
  const routesDir = path.join(projectRoot, 'apps/api/src/routes');
  const outputPath = path.join(projectRoot, 'docs/api-spec.yaml');

  try {
    if (!fs.existsSync(routesDir)) {
      throw new Error(`Routes directory not found: ${routesDir}`);
    }

    const spec: OpenAPISpec = {
      openapi: '3.0.3',
      info: {
        title: 'RAKUDA API',
        version: '1.0.0',
        description: '越境EC自動化システム RAKUDA の API仕様書',
      },
      servers: [{ url: 'http://localhost:3000', description: 'Development' }],
      paths: {},
      tags: [],
    };

    const files = fs
      .readdirSync(routesDir)
      .filter((f) => f.endsWith('.ts') && !f.includes('factory'));

    const seenTags = new Set<string>();

    for (const file of files) {
      try {
        const basePath = fileToBasePath(file);
        const tag = fileToTag(file);
        const endpoints = extractEndpoints(path.join(routesDir, file));

        if (endpoints.length > 0 && !seenTags.has(tag)) {
          spec.tags.push({ name: tag, description: `${tag} endpoints` });
          seenTags.add(tag);
        }

        for (const ep of endpoints) {
          const fullPath = basePath + ep.path;
          // Express :param → OpenAPI {param} 変換
          const openApiPath = fullPath.replace(/:(\w+)/g, '{$1}');

          if (!spec.paths[openApiPath]) spec.paths[openApiPath] = {};
          spec.paths[openApiPath][ep.method] = {
            summary: `${ep.method.toUpperCase()} ${fullPath}`,
            tags: [tag],
            responses: { '200': { description: 'Success' } },
          };
        }
      } catch (fileErr) {
        console.warn(`Warn: failed to process ${file}:`, (fileErr as Error).message);
        continue;
      }
    }

    // docs/ ディレクトリが存在しない場合は作成
    const docsDir = path.dirname(outputPath);
    ensureDirSync(docsDir);

    fs.writeFileSync(outputPath, yaml.stringify(spec), 'utf-8');

    console.log(`Generated OpenAPI spec: ${outputPath}`);
    console.log(`Total paths: ${Object.keys(spec.paths).length}`);
    console.log(`Total tags: ${spec.tags.length}`);
    return 0;
  } catch (err) {
    console.error('Failed to generate OpenAPI spec:', (err as Error).message);
    return 1;
  }
}

process.exitCode = generateSpec();

