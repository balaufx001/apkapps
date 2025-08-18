import { create } from 'zustand';
import { AppDetails, AppFilters, Category } from '../types';
import { fetchAllApps, fetchAppById, fetchCategories } from '../lib/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://demo.supabase.co';

interface AppState {
  apps: AppDetails[];
  categories: Category[];
  selectedApp: AppDetails | null;
  filters: AppFilters;
  isLoading: boolean;
  error: string | null;
  fetchApps: () => Promise<void>;
  fetchApp: (id: string) => Promise<void>;
  loadCategories: () => Promise<void>;
  setFilters: (filters: Partial<AppFilters>) => void;
  clearError: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  apps: [],
  categories: [],
  selectedApp: null,
  filters: {
    sortBy: 'newest',
  },
  isLoading: false,
  error: null,
  
  fetchApps: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // Use mock data if Supabase is not configured
      if (supabaseUrl.includes('placeholder')) {
        const mockApps = [
          {
            id: '1',
            title: 'Sample App 1',
            description: 'This is a sample application for demonstration purposes.',
            version: '1.0.0',
            package_name: 'com.example.app1',
            category: 'productivity',
            icon_url: 'https://images.pexels.com/photos/147413/twitter-facebook-together-exchange-of-information-147413.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=2',
            screenshots: ['https://images.pexels.com/photos/147413/twitter-facebook-together-exchange-of-information-147413.jpeg'],
            file_size: 5242880,
            file_url: '#',
            download_count: 1250,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            user_id: '1',
            status: 'published' as const,
            user: { id: '1', full_name: 'Demo Developer', avatar_url: null }
          },
          {
            id: '2',
            title: 'Sample App 2',
            description: 'Another sample application showcasing the platform features.',
            version: '2.1.0',
            package_name: 'com.example.app2',
            category: 'games',
            icon_url: 'https://images.pexels.com/photos/193003/pexels-photo-193003.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=2',
            screenshots: ['https://images.pexels.com/photos/193003/pexels-photo-193003.jpeg'],
            file_size: 10485760,
            file_url: '#',
            download_count: 850,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            user_id: '2',
            status: 'published' as const,
            user: { id: '2', full_name: 'Game Developer', avatar_url: null }
          }
        ];
        
        set({ apps: mockApps, isLoading: false });
        return;
      }
      
      const { data, error } = await fetchAllApps(get().filters).catch(() => ({ data: [], error: null }));
      
      if (error) {
        console.warn('Failed to fetch apps:', error);
        set({ apps: [], isLoading: false });
        return;
      }
      
      set({ 
        apps: (data as AppDetails[]) || [], 
        isLoading: false 
      });
    } catch (error: any) {
      set({ 
        apps: [],
        isLoading: false, 
        error: null
      });
    }
  },
  
  fetchApp: async (id) => {
    try {
      set({ isLoading: true, error: null });
      const { data, error } = await fetchAppById(id);
      
      if (error) throw error;
      
      set({ 
        selectedApp: data as AppDetails, 
        isLoading: false 
      });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.message || 'Failed to fetch app details' 
      });
    }
  },
  
  loadCategories: async () => {
    try {
      // Use mock categories if Supabase is not configured
      if (supabaseUrl.includes('placeholder')) {
        const mockCategories = [
          { id: '1', name: 'Productivity', slug: 'productivity' },
          { id: '2', name: 'Games', slug: 'games' },
          { id: '3', name: 'Social', slug: 'social' },
          { id: '4', name: 'Education', slug: 'education' },
          { id: '5', name: 'Entertainment', slug: 'entertainment' }
        ];
        
        set({ categories: mockCategories });
        return;
      }
      
      const { data, error } = await fetchCategories().catch(() => ({ data: [], error: null }));
      
      if (error) {
        console.warn('Failed to load categories:', error);
        return;
      }
      
      set({ categories: (data as Category[]) || [] });
    } catch (error: any) {
      console.warn('Failed to load categories:', error);
    }
  },
  
  setFilters: (filters) => {
    set({ 
      filters: { ...get().filters, ...filters }
    });
    get().fetchApps();
  },
  
  clearError: () => set({ error: null }),
}));