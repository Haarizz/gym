import api from '../../api/axiosConfig';

interface CatalogDisplaySectionWire {
  id: number;
  section_key: string;
  title: string;
  description?: string;
  enabled: boolean;
  sort_order: number;
}

export interface CatalogDisplaySection {
  id: number;
  sectionKey: string;
  title: string;
  description?: string;
  enabled: boolean;
  sortOrder: number;
}

export interface CatalogDisplaySectionRequestData {
  sectionKey?: string;
  title?: string;
  description?: string;
  enabled?: boolean;
  sortOrder?: number;
}

function mapSection(w: CatalogDisplaySectionWire): CatalogDisplaySection {
  return {
    id: w.id,
    sectionKey: w.section_key,
    title: w.title,
    description: w.description,
    enabled: w.enabled,
    sortOrder: w.sort_order,
  };
}

export const catalogDisplaySectionService = {
  getAll: async (): Promise<CatalogDisplaySection[]> => {
    const res = await api.get<CatalogDisplaySectionWire[]>('/gymos/catalog-sections');
    return res.data.map(mapSection);
  },

  create: async (data: CatalogDisplaySectionRequestData): Promise<CatalogDisplaySection> => {
    const res = await api.post<CatalogDisplaySectionWire>('/gymos/catalog-sections', data);
    return mapSection(res.data);
  },

  update: async (id: number, data: CatalogDisplaySectionRequestData): Promise<CatalogDisplaySection> => {
    const res = await api.put<CatalogDisplaySectionWire>(`/gymos/catalog-sections/${id}`, data);
    return mapSection(res.data);
  },

  toggle: async (id: number): Promise<CatalogDisplaySection> => {
    const res = await api.patch<CatalogDisplaySectionWire>(`/gymos/catalog-sections/${id}/toggle`);
    return mapSection(res.data);
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/gymos/catalog-sections/${id}`);
  },
};
