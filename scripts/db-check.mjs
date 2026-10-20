import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function parseEnvFile(filePath) {
  const result = {};
  if (!fs.existsSync(filePath)) {
    return result;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function loadSupabaseEnv() {
  const envPath = path.join(projectRoot, '.env');
  const envLocalPath = path.join(projectRoot, '.env.local');
  const fileVars = {
    ...parseEnvFile(envPath),
    ...parseEnvFile(envLocalPath),
  };

  const url = (process.env.VITE_SUPABASE_URL || fileVars.VITE_SUPABASE_URL || '').trim();
  const anonKey = (
    process.env.VITE_SUPABASE_ANON_KEY ||
    fileVars.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  return {
    hasEnvFile: fs.existsSync(envPath) || fs.existsSync(envLocalPath),
    url,
    anonKey,
  };
}

async function main() {
  const { url, anonKey } = loadSupabaseEnv();

  if (!url || !anonKey) {
    console.log(
      [
        'Файл .env не найден или не заданы переменные VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY.',
        'Проверка облачной базы пропущена (приложение работает в локальном режиме).',
        '',
        'Чтобы подключить и проверить базу Supabase, создайте файл .env в корне проекта:',
        '  VITE_SUPABASE_URL=https://<ваш-проект>.supabase.co',
        '  VITE_SUPABASE_ANON_KEY=<ваш-публичный-ключ-anon>',
        '  VITE_ADMIN_EMAIL=admin@example.com',
        '',
        'После этого запустите проверку снова: npm run db:check',
      ].join('\n')
    );
    process.exit(0);
  }

  const supabase = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  // 1. Анонимное чтение menu_documents id='main'
  let data = null;
  let error = null;
  try {
    const res = await supabase
      .from('menu_documents')
      .select('id, data, updated_at')
      .eq('id', 'main')
      .maybeSingle();
    data = res.data;
    error = res.error;
  } catch (err) {
    console.error(
      `Ошибка сети при обращении к Supabase (${url}): ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    process.exit(1);
  }

  if (error) {
    const msg = String(error.message || '');
    const code = String(error.code || '');
    const isTableMissing =
      code === '42P01' ||
      code === 'PGRST205' ||
      /relation .* does not exist|Could not find the table|schema cache/i.test(msg);

    if (isTableMissing) {
      console.error(
        'Ошибка: таблица public.menu_documents не найдена в базе данных — выполните supabase/schema.sql в SQL Editor вашего проекта Supabase.'
      );
    } else {
      console.error(
        `Ошибка чтения из Supabase (${code || 'error'}): ${msg}. Если схема ещё не создана, выполните supabase/schema.sql.`
      );
    }
    process.exit(1);
  }

  if (!data || !data.data) {
    console.error(
      'Ошибка: запись меню (id=\'main\') отсутствует в таблице menu_documents — войдите в админку и нажмите "Загрузить начальное меню".'
    );
    process.exit(1);
  }

  // 2. Проверка RLS: анонимный UPDATE должен быть отклонён
  const { data: updatedRows, error: updateError } = await supabase
    .from('menu_documents')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', 'main')
    .select('id');

  const updateSucceeded =
    !updateError && Array.isArray(updatedRows) && updatedRows.length > 0;

  if (updateSucceeded) {
    console.error(
      'ОШИБКА БЕЗОПАСНОСТИ (RLS): анонимный UPDATE записи menu_documents прошёл успешно! Выполните supabase/schema.sql для включения Row Level Security.'
    );
    process.exit(1);
  }

  const categories = Array.isArray(data.data?.categories) ? data.data.categories : [];
  const totalItems = categories.reduce(
    (sum, cat) => sum + (Array.isArray(cat?.items) ? cat.items.length : 0),
    0
  );
  const updatedStr = data.updated_at
    ? new Date(data.updated_at).toLocaleString('ru-RU')
    : 'неизвестно';

  console.log(
    `OK: меню в базе, ${totalItems} позиций, обновлено ${updatedStr} (анонимный UPDATE отклонён RLS)`
  );
}

main().catch((err) => {
  console.error('Непредвиденная ошибка db:check:', err);
  process.exit(1);
});
