export interface OpenApiInfo {
  title: string;
  version: string;
  description: string;
  contact?: {
    name: string;
    url?: string;
  };
}

export interface OpenApiPathItem {
  summary: string;
  description?: string;
  tags?: string[];
  parameters?: Array<{
    name: string;
    in: 'query' | 'header' | 'path' | 'cookie';
    required?: boolean;
    schema: Record<string, any>;
  }>;
  responses: Record<string, {
    description: string;
    content?: Record<string, {
      schema: Record<string, any>;
    }>;
  }>;
}

export interface OpenApiDocument {
  openapi: string;
  info: OpenApiInfo;
  paths: Record<string, Record<string, OpenApiPathItem>>;
}
