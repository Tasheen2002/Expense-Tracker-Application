type JsonSchemaObject = Record<string, unknown>;

export function successResponse(dataSchema: JsonSchemaObject, statusCode = 200) {
  return {
    [statusCode]: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        statusCode: { type: 'integer' },
        message: { type: 'string' },
        data: dataSchema,
      },
    } as const,
  };
}

export const noContentResponse = {
  204: { type: 'null', description: 'No Content' },
} as const;
