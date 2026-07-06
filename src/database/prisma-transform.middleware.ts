import { Prisma } from '@prisma/client';

const transformFieldsMiddleware: Prisma.Middleware = async (params, next) => {
  // Transform input: camelCase → snake_case
  if (params.args && typeof params.args === 'object') {
    params.args = transformCamelToSnake(params.args);
  }

  // Execute Prisma operation
  const result = await next(params);

  // Transform output: snake_case → camelCase
  if (result && typeof result === 'object') {
    return transformSnakeToCamel(result);
  }

  return result;
};

function transformCamelToSnake(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(transformCamelToSnake);
  }

  if (obj !== null && obj !== undefined && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = key.replace(/([A-Z])/g, (_, letter) => `_${letter.toLowerCase()}`);
      result[snakeKey] = transformCamelToSnake(obj[key]);
      return result;
    }, {} as any);
  }

  return obj;
}

function transformSnakeToCamel(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(transformSnakeToCamel);
  }

  if (obj !== null && obj !== undefined && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = transformSnakeToCamel(obj[key]);
      return result;
    }, {} as any);
  }

  return obj;
}

export default transformFieldsMiddleware;
