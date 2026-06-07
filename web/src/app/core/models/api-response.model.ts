export interface ApiResponse<T> {
  success:   boolean;
  data:      T | null;
  error:     string | null;
  timestamp: string;
}

export interface PagedResult<T> {
  items:      T[];
  totalCount: number;
  page:       number;
  pageSize:   number;
}
