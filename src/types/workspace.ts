export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type VariableScope = 'workspace' | 'collection' | 'request';

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export type BodyType = 'none' | 'form-data' | 'x-www-form-urlencoded' | 'json' | 'xml' | 'text';

export interface RequestBody {
  type: BodyType;
  raw?: string;
  formData?: KeyValuePair[];
}

export interface Script {
  id: string;
  type: 'pre-request' | 'test';
  code: string;
}

export interface Variable {
  id: string;
  key: string;
  value: string;
  scope: VariableScope;
  enabled: boolean;
}

export interface Request {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  queryParams: KeyValuePair[];
  body: RequestBody;
  variables: Variable[];
  scripts: Script[];
}

export interface Collection {
  id: string;
  name: string;
  requests: Request[];
  variables: Variable[];
}

export interface Workspace {
  id: string;
  name: string;
  collections: Collection[];
  variables: Variable[];
}

export type TreeNode = Workspace | Collection | Request;

export type TreeNodeType = 'workspace' | 'collection' | 'request';
