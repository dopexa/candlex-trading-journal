/*
 * Hosted CandleX backend adapter.
 * Configure only with the Supabase Project URL and publishable key.
 * Never put a Supabase secret/service_role key in this file.
 */
(() => {
  const config = {
    url: 'https://rbiornjsvaxydzieoxpy.supabase.co',
    publishableKey: 'sb_publishable_OcCjiEzK1f4bBwefgbNhRQ_ok0q_-Yk'
  };
  const enabled = Boolean(config.url && config.publishableKey && window.supabase?.createClient);
  const bucket = 'trade-screenshots';
  const maxImageBytes = 5 * 1024 * 1024;
  const maxImages = 5;
  const emotions = ['Confident','Anxious','Excited','Fearful','Calm','Frustrated','Euphoric','Regretful','Focused','Impulsive'];
  const currencies = ['USD','EUR','GBP','JPY','CAD','AUD','INR'];
  const allowedMimeTypes = ['image/jpeg','image/png','image/webp','image/gif'];
  const client = enabled ? window.supabase.createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  }) : null;

  function friendlyError(error, fallback) {
    const message = String(error?.message || '');
    if (/invalid login credentials/i.test(message)) return 'Email or password is incorrect.';
    if (/already registered|already been registered|user already exists/i.test(message)) return 'An account with this email already exists. Sign in instead.';
    if (/email not confirmed/i.test(message)) return 'Confirm your email address using the link we sent, then sign in.';
    if (/password.*(weak|short|length)|should be at least/i.test(message)) return 'Use a stronger password with at least 10 characters.';
    if (/network|fetch/i.test(message)) return 'Could not reach CandleX storage. Check your connection and try again.';
    return fallback || 'CandleX could not complete that request. Please try again.';
  }

  function unwrap(result, fallback) {
    if (result?.error) throw new Error(friendlyError(result.error, fallback));
    return result?.data;
  }

  async function signedImageList(rows) {
    if (!rows.length) return [];
    const signed = unwrap(await client.storage.from(bucket).createSignedUrls(rows.map(row => row.storage_path), 60 * 60 * 24 * 7), 'Could not load trade screenshots.');
    const byPath = new Map((signed || []).map(item => [item.path, item.signedUrl]));
    return rows.map(row => {
      const url = byPath.get(row.storage_path);
      if (!url) throw new Error('A trade screenshot could not be opened. Refresh the page and try again.');
      return { id: row.id, name: row.file_name, type: row.mime_type, url };
    });
  }

  async function ownedTradeImages(tradeId, userId) {
    return unwrap(await client.from('trade_images')
      .select('id,user_id,trade_id,storage_path,file_name,mime_type,created_at')
      .eq('trade_id', tradeId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true }), 'Could not load screenshots for this trade.') || [];
  }

  function toTrade(row, images) {
    return { ...row.trade_data, id: row.id, date: row.trade_date, images };
  }

  async function fetchTrade(tradeId, userId) {
    const row = unwrap(await client.from('trades')
      .select('id,user_id,trade_date,trade_data')
      .eq('id', tradeId)
      .eq('user_id', userId)
      .single(), 'Trade not found.');
    const imageRows = await ownedTradeImages(row.id, userId);
    return toTrade(row, await signedImageList(imageRows));
  }

  async function currentUser() {
    return unwrap(await client.auth.getUser(), 'Please sign in again.')?.user || null;
  }

  function normalizePreferences(body, userId) {
    const settings = body?.settings || {};
    if (!currencies.includes(settings.currency || 'USD')) throw new Error('Choose a supported currency.');
    if (!['dark','light'].includes(settings.theme || 'dark')) throw new Error('Choose a supported theme.');
    const sourceGoals = settings.goals || {};
    const dailyLossLimit = Number(sourceGoals.dailyLossLimit || 0);
    const weeklyProfitTarget = Number(sourceGoals.weeklyProfitTarget || 0);
    const weeklyTradeTarget = Number(sourceGoals.weeklyTradeTarget || 0);
    if (!Number.isFinite(dailyLossLimit) || dailyLossLimit < 0 || dailyLossLimit > 1e9 || !Number.isFinite(weeklyProfitTarget) || weeklyProfitTarget < 0 || weeklyProfitTarget > 1e9 || !Number.isInteger(weeklyTradeTarget) || weeklyTradeTarget < 0 || weeklyTradeTarget > 10000) {
      throw new Error('Risk limits and weekly goals must be valid non-negative numbers.');
    }
    const sourceReviews = settings.weeklyReviews || {};
    if (!sourceReviews || typeof sourceReviews !== 'object' || Array.isArray(sourceReviews)) throw new Error('Weekly review data is not valid.');
    const reviewKeys = Object.keys(sourceReviews).sort().slice(-52);
    const weeklyReviews = {};
    for (const key of reviewKeys) {
      const review = sourceReviews[key];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !review || typeof review !== 'object' || Array.isArray(review)) throw new Error('Weekly review data is not valid.');
      const normalized = {};
      for (const field of ['wins','improve','focus']) {
        const text = review[field] || '';
        if (typeof text !== 'string' || text.length > 2000) throw new Error('Each weekly review note must be 2,000 characters or fewer.');
        normalized[field] = text.trim();
      }
      weeklyReviews[key] = normalized;
    }
    if (!Array.isArray(body?.accounts || [])) throw new Error('Trading accounts are not valid.');
    const accounts = [];
    for (const value of (body.accounts || [])) {
      if (typeof value !== 'string' || !value.trim() || value.trim().length > 80) throw new Error('Trading account names must be 1–80 characters.');
      const label = value.trim();
      if (!accounts.some(item => item.toLowerCase() === label.toLowerCase())) accounts.push(label);
    }
    if (accounts.length > 100) throw new Error('You can save up to 100 trading accounts.');
    return { user_id: userId, settings: { currency: settings.currency || 'USD', theme: settings.theme || 'dark', goals: { dailyLossLimit, weeklyProfitTarget, weeklyTradeTarget }, weeklyReviews }, accounts };
  }

  function normalizeTrade(value) {
    if (!value || typeof value !== 'object') throw new Error('Trade details are missing.');
    const date = typeof value.date === 'string' ? value.date : '';
    const parsedDate = new Date(`${date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) throw new Error('Choose a valid trade date.');
    const instrument = typeof value.instrument === 'string' ? value.instrument.trim() : '';
    const account = typeof value.account === 'string' ? value.account.trim() : '';
    const amount = Number(value.amount);
    if (!instrument || instrument.length > 64) throw new Error('Enter an instrument name up to 64 characters.');
    if (!account || account.length > 80) throw new Error('Choose a trading account.');
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter a trade amount greater than zero.');
    if (!['long','short'].includes(value.dir)) throw new Error('Choose a valid trade direction.');
    if (!['profit','loss'].includes(value.result)) throw new Error('Choose a valid trade result.');
    const tags = value.tags || [];
    if (!Array.isArray(tags) || tags.length > 30 || tags.some(tag => typeof tag !== 'string' || !tag.trim() || tag.trim().length > 40)) throw new Error('Tags must be up to 40 characters, with up to 30 tags.');
    const selectedEmotions = value.emotions || [];
    if (!Array.isArray(selectedEmotions) || selectedEmotions.some(item => !emotions.includes(item))) throw new Error('Choose emotions from the available list.');
    const trade = {
      date,
      instrument,
      dir: value.dir,
      result: value.result,
      amount,
      account,
      tags: [...new Set(tags.map(tag => tag.trim()))],
      emotions: [...new Set(selectedEmotions)]
    };
    for (const field of ['marketConditions','rationale','lessons']) {
      const note = value[field] || '';
      if (typeof note !== 'string' || note.length > 5000) throw new Error('Each note must be 5,000 characters or fewer.');
      trade[field] = note.trim();
    }
    if (typeof value.notes === 'string' && value.notes.trim()) trade.notes = value.notes.trim().slice(0, 5000);
    return trade;
  }

  function decodeImage(image) {
    if (!image || typeof image.data !== 'string' || !allowedMimeTypes.includes(image.type)) throw new Error('Use a JPG, PNG, WebP, or GIF screenshot.');
    const match = image.data.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!match || match[1] !== image.type) throw new Error('A screenshot could not be read.');
    const binary = atob(match[2]);
    if (!binary.length || binary.length > maxImageBytes) throw new Error('Each screenshot must be 5 MB or smaller.');
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    const startsWith = signature => signature.every((byte, index) => bytes[index] === byte);
    const signatureValid = image.type === 'image/jpeg' ? startsWith([0xff,0xd8,0xff])
      : image.type === 'image/png' ? startsWith([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])
      : image.type === 'image/gif' ? String.fromCharCode(...bytes.slice(0, 6)).startsWith('GIF8')
      : image.type === 'image/webp' ? bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
      : false;
    if (!signatureValid) throw new Error('The uploaded file is not a supported image.');
    return new Blob([bytes], { type: image.type });
  }

  function imageName(name) {
    const safeName = String(name || 'Screenshot').replace(/\\/g, '/').split('/').pop().trim().slice(0, 160);
    return safeName || 'Screenshot';
  }

  function imageExtension(mime) {
    return ({ 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp', 'image/gif':'gif' })[mime];
  }

  async function insertImages(userId, tradeId, images) {
    const added = [];
    const uploadedPaths = [];
    try {
      for (const image of images) {
        const blob = decodeImage(image);
        const id = crypto.randomUUID();
        const path = `${userId}/${tradeId}/${id}.${imageExtension(image.type)}`;
        unwrap(await client.storage.from(bucket).upload(path, blob, {
          cacheControl: '3600',
          contentType: image.type,
          upsert: false
        }), 'Could not upload a screenshot. Check the file and try again.');
        uploadedPaths.push(path);
        const row = unwrap(await client.from('trade_images').insert({
          user_id: userId,
          trade_id: tradeId,
          storage_path: path,
          file_name: imageName(image.name),
          mime_type: image.type
        }).select('id,user_id,trade_id,storage_path,file_name,mime_type,created_at').single(), 'Could not save screenshot details.');
        added.push(row);
      }
      return added;
    } catch (error) {
      if (added.length) {
        await client.from('trade_images').delete().eq('user_id', userId).in('id', added.map(item => item.id));
      }
      if (uploadedPaths.length) await client.storage.from(bucket).remove(uploadedPaths);
      throw error;
    }
  }

  async function restoreRemovedImages(rows) {
    if (!rows.length) return;
    await client.from('trade_images').insert(rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      trade_id: row.trade_id,
      storage_path: row.storage_path,
      file_name: row.file_name,
      mime_type: row.mime_type,
      created_at: row.created_at
    })));
  }

  async function saveTrade(userId, tradeId, body) {
    const trade = normalizeTrade(body?.trade);
    if (body?.images !== undefined && !Array.isArray(body.images)) throw new Error('Screenshot data is not valid.');
    const images = Array.isArray(body?.images) ? body.images : [];
    const keepIds = tradeId ? body?.keepImageIds : [];
    if (!Array.isArray(keepIds) || keepIds.some(id => typeof id !== 'string') || new Set(keepIds).size !== keepIds.length) throw new Error('Screenshot data is not valid.');
    if (images.length + keepIds.length > maxImages) throw new Error('A trade can have up to 5 screenshots.');

    if (!tradeId) {
      if (images.length > maxImages) throw new Error('A trade can have up to 5 screenshots.');
      const row = unwrap(await client.from('trades').insert({ user_id: userId, trade_date: trade.date, trade_data: trade })
        .select('id,user_id,trade_date,trade_data').single(), 'Could not save the trade.');
      try {
        await insertImages(userId, row.id, images);
        return { trade: await fetchTrade(row.id, userId) };
      } catch (error) {
        await client.from('trades').delete().eq('id', row.id).eq('user_id', userId);
        throw error;
      }
    }

    const existing = await ownedTradeImages(tradeId, userId);
    const existingIds = new Set(existing.map(item => item.id));
    const keep = new Set(keepIds);
    if ([...keep].some(id => !existingIds.has(id))) throw new Error('One or more selected screenshots are no longer available.');
    const removed = existing.filter(item => !keep.has(item.id));
    if (removed.length) {
      unwrap(await client.from('trade_images').delete().eq('trade_id', tradeId).eq('user_id', userId).in('id', removed.map(item => item.id)), 'Could not update screenshots.');
    }

    let added = [];
    try {
      added = await insertImages(userId, tradeId, images);
      unwrap(await client.from('trades').update({ trade_date: trade.date, trade_data: trade })
        .eq('id', tradeId).eq('user_id', userId).select('id').single(), 'Could not update the trade.');
    } catch (error) {
      if (added.length) {
        await client.from('trade_images').delete().eq('user_id', userId).in('id', added.map(item => item.id));
        await client.storage.from(bucket).remove(added.map(item => item.storage_path));
      }
      await restoreRemovedImages(removed);
      throw error;
    }
    if (removed.length) {
      const cleanup = await client.storage.from(bucket).remove(removed.map(item => item.storage_path));
      if (cleanup.error) console.warn('CandleX left unreferenced private screenshot files for cleanup.');
    }
    return { trade: await fetchTrade(tradeId, userId) };
  }

  async function loadData(userId) {
    const prefResult = await client.from('user_preferences').select('settings,accounts').eq('user_id', userId).maybeSingle();
    const preferences = unwrap(prefResult, 'Could not load your journal settings.') || { settings: { currency: 'USD', theme: 'dark' }, accounts: [] };
    const tradeRows = unwrap(await client.from('trades')
      .select('id,user_id,trade_date,trade_data')
      .eq('user_id', userId)
      .order('trade_date', { ascending: false })
      .order('created_at', { ascending: false }), 'Could not load your trades.') || [];
    const ids = tradeRows.map(row => row.id);
    const imageRows = ids.length ? unwrap(await client.from('trade_images')
      .select('id,user_id,trade_id,storage_path,file_name,mime_type,created_at')
      .eq('user_id', userId).in('trade_id', ids)
      .order('created_at', { ascending: true }), 'Could not load your screenshots.') || [] : [];
    const imageLists = new Map();
    const signedImages = await signedImageList(imageRows);
    imageRows.forEach((row, index) => {
      const items = imageLists.get(row.trade_id) || [];
      items.push(signedImages[index]);
      imageLists.set(row.trade_id, items);
    });
    return {
      trades: tradeRows.map(row => toTrade(row, imageLists.get(row.id) || [])),
      settings: preferences.settings || { currency: 'USD', theme: 'dark' },
      accounts: Array.isArray(preferences.accounts) ? preferences.accounts : []
    };
  }

  async function hostedApi(path, method = 'GET', body) {
    const route = new URL(path, location.href).pathname;
    if (route === '/api/session' && method === 'GET') {
      const session = unwrap(await client.auth.getSession(), 'Could not check your sign-in session.')?.session;
      return { user: session?.user ? { id: session.user.id, email: session.user.email } : null };
    }
    if (route === '/api/auth/register' && method === 'POST') {
      const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = body?.password;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
      if (typeof password !== 'string' || password.length < 10 || password.length > 128) throw new Error('Use a password between 10 and 128 characters.');
      const result = unwrap(await client.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}${location.pathname}` }
      }), 'Could not create your account.');
      return { user: result.user ? { id: result.user.id, email: result.user.email } : null, pendingConfirmation: !result.session };
    }
    if (route === '/api/auth/login' && method === 'POST') {
      const result = unwrap(await client.auth.signInWithPassword({
        email: String(body?.email || '').trim().toLowerCase(),
        password: String(body?.password || '')
      }), 'Could not sign in.');
      return { user: { id: result.user.id, email: result.user.email } };
    }
    if (route === '/api/auth/logout' && method === 'POST') {
      unwrap(await client.auth.signOut(), 'Could not sign out.');
      return { ok: true };
    }
    const user = await currentUser();
    if (!user) throw new Error('Your session expired. Sign in again to continue.');
    if (route === '/api/data' && method === 'GET') return loadData(user.id);
    if (route === '/api/settings' && method === 'PUT') {
      const record = normalizePreferences(body, user.id);
      const saved = unwrap(await client.from('user_preferences').upsert(record).select('settings,accounts').single(), 'Could not save your settings.');
      return { settings: saved.settings, accounts: saved.accounts };
    }
    if (route === '/api/trades' && method === 'POST') return saveTrade(user.id, null, body);
    const match = route.match(/^\/api\/trades\/([^/]+)$/);
    if (match) {
      const id = decodeURIComponent(match[1]);
      if (method === 'PUT') return saveTrade(user.id, id, body);
      if (method === 'DELETE') {
        const rows = await ownedTradeImages(id, user.id);
        unwrap(await client.from('trades').delete().eq('id', id).eq('user_id', user.id).select('id').single(), 'Trade not found.');
        if (rows.length) {
          const cleanup = await client.storage.from(bucket).remove(rows.map(item => item.storage_path));
          if (cleanup.error) console.warn('CandleX left unreferenced private screenshot files for cleanup.');
        }
        return { ok: true };
      }
    }
    throw new Error('This CandleX action is not available.');
  }

  window.CandleXHosted = { enabled, api: hostedApi };
})();
