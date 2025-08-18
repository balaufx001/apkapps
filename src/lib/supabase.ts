import { createClient } from '@supabase/supabase-js';
import { AppDetails, VersionHistory } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://demo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo-key';

// Add import for the URL check
const isPlaceholder = supabaseUrl.includes('placeholder') || supabaseUrl.includes('demo');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Authentication helpers
export const signUp = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

// App management helpers
export const fetchAllApps = async (filters?: any) => {
  let query = supabase
    .from('apps')
    .select('*, user:user_id(id, full_name, avatar_url)');

  if (filters?.search) {
    query = query.ilike('title', `%${filters.search}%`);
  }

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  switch (filters?.sortBy) {
    case 'popular':
      query = query.order('download_count', { ascending: false });
      break;
    case 'alphabetical':
      query = query.order('title', { ascending: true });
      break;
    case 'newest':
    default:
      query = query.order('publish_date', { ascending: false });
      break;
  }

  const { data, error } = await query;
  return { data, error };
};

export const fetchAppById = async (id: string) => {
  const { data, error } = await supabase
    .from('apps')
    .select('*, user:user_id(id, full_name, avatar_url)')
    .eq('id', id)
    .single();
  return { data, error };
};

export const uploadApp = async (
  userId: string,
  appData: Omit<AppDetails, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'download_count' | 'status' | 'publish_date'>,
  apkFile: File,
  iconFile: File,
  screenshotFiles: File[]
) => {
  // Upload APK file
  const apkFileName = `${userId}/${Date.now()}-${apkFile.name}`;
  const { data: apkData, error: apkError } = await supabase.storage
    .from('apk_files')
    .upload(apkFileName, apkFile);

  if (apkError) return { error: apkError };

  // Upload app icon
  const iconFileName = `${userId}/${Date.now()}-${iconFile.name}`;
  const { data: iconData, error: iconError } = await supabase.storage
    .from('app_icons')
    .upload(iconFileName, iconFile);

  if (iconError) return { error: iconError };

  // Upload screenshots
  const screenshotUrls = [];
  for (const screenshot of screenshotFiles) {
    const screenshotFileName = `${userId}/${Date.now()}-${screenshot.name}`;
    const { data: screenshotData, error: screenshotError } = await supabase.storage
      .from('app_screenshots')
      .upload(screenshotFileName, screenshot);

    if (screenshotError) return { error: screenshotError };

    const { data: screenshotUrl } = supabase.storage
      .from('app_screenshots')
      .getPublicUrl(screenshotFileName);

    screenshotUrls.push(screenshotUrl.publicUrl);
  }

  // Get public URLs
  const { data: apkUrl } = supabase.storage.from('apk_files').getPublicUrl(apkFileName);
  const { data: iconUrl } = supabase.storage.from('app_icons').getPublicUrl(iconFileName);

  // Create app entry in database
  const { data, error } = await supabase.from('apps').insert({
    ...appData,
    user_id: userId,
    file_url: apkUrl.publicUrl,
    icon_url: iconUrl.publicUrl,
    screenshots: screenshotUrls,
    download_count: 0,
    status: 'draft'
  }).select();

  if (data) {
    // Add initial version to version history
    await supabase.from('version_history').insert({
      app_id: data[0].id,
      version: appData.version,
      changelog: 'Initial release',
      file_url: apkUrl.publicUrl,
      file_size: apkFile.size,
      created_by: userId
    });
  }

  return { data, error };
};

export const publishApp = async (appId: string) => {
  const { data, error } = await supabase.rpc('publish_app', {
    app_id: appId
  });
  return { data, error };
};

export const updateAppVersion = async (
  appId: string,
  version: string,
  changelog: string,
  apkFile: File
) => {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) return { error: new Error('Not authenticated') };

  // Upload new APK file
  const apkFileName = `${userId}/${Date.now()}-${apkFile.name}`;
  const { data: apkData, error: apkError } = await supabase.storage
    .from('apk_files')
    .upload(apkFileName, apkFile);

  if (apkError) return { error: apkError };

  // Get public URL
  const { data: apkUrl } = supabase.storage.from('apk_files').getPublicUrl(apkFileName);

  // Update app version
  const { error: updateError } = await supabase
    .from('apps')
    .update({ 
      version,
      file_url: apkUrl.publicUrl,
      file_size: apkFile.size,
      updated_at: new Date().toISOString()
    })
    .eq('id', appId);

  if (updateError) return { error: updateError };

  // Add to version history
  const { data, error: historyError } = await supabase
    .from('version_history')
    .insert({
      app_id: appId,
      version,
      changelog,
      file_url: apkUrl.publicUrl,
      file_size: apkFile.size,
      created_by: userId
    })
    .select();

  return { data, error: historyError };
};

export const incrementDownloadCount = async (appId: string) => {
  const { data, error } = await supabase.rpc('increment_download_count', {
    app_id: appId,
  });
  
  return { data, error };
};

export const fetchUserApps = async (userId: string) => {
  const { data, error } = await supabase
    .from('apps')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  return { data, error };
};

export const fetchCategories = async () => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });
  
  return { data, error };
};

export const fetchAppVersions = async (appId: string) => {
  const { data, error } = await supabase
    .from('version_history')
    .select('*')
    .eq('app_id', appId)
    .order('created_at', { ascending: false });

  return { data, error };
};