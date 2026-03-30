export abstract class DomainError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly name: string;

  constructor(message: string, codeOrStatusCode?: string | number, statusCode?: number) {
    super(message);
    
    if (typeof codeOrStatusCode === 'string') {
      this.code = codeOrStatusCode;
      this.statusCode = statusCode ?? 400;
    } else {
      this.code = 'DOMAIN_ERROR';
      this.statusCode = codeOrStatusCode ?? 400;
    }

    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  public toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}
